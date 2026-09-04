import app from '../../src/app';
import { supabase } from '../../src/lib/supabase';
import { env } from '../../src/config/env';
import { createClient } from '@supabase/supabase-js';
import http from 'http';
import { AddressInfo } from 'net';

/**
 * NexGuard Comprehensive Backend Integration Test Suite
 * Covers authentication, dataset upload/storage, analysis lifecycle,
 * asynchronous background processing, results retrieval, ownership isolation,
 * error handling, and security.
 */


async function runAllIntegrationTests() {
  console.log('\n================================================================');
  console.log('       NEXGUARD BACKEND API INTEGRATION TEST SUITE              ');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  async function testStep(name: string, fn: () => Promise<void>) {
    process.stdout.write(`  • Testing ${name}... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passedCount++;
    } catch (err: any) {
      console.log('❌ FAILED');
      console.error(`    Error: ${err.message || err}`);
      failedCount++;
      throw err;
    }
  }

  // 1. Start Ephemeral App Server
  const appServer = http.createServer(app);
  await new Promise<void>((resolve) => appServer.listen(0, () => resolve()));
  const appPort = (appServer.address() as AddressInfo).port;
  const baseUrl = `http://localhost:${appPort}`;

  // 2. Start Ephemeral Mock ML Server
  let mockMLBehavior: 'SUCCESS' | 'ERROR_500' | 'MALFORMED' | 'DELAY_SUCCESS' = 'SUCCESS';
  const mockMLServer = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.url === '/predict' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        const parsed = JSON.parse(body || '{}');

        if (mockMLBehavior === 'ERROR_500') {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ detail: 'Model execution failed internally' }));
          return;
        }

        if (mockMLBehavior === 'MALFORMED') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ unexpected_key: true }));
          return;
        }

        const delay = mockMLBehavior === 'DELAY_SUCCESS' ? 120 : 10;
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              analysis_id: parsed.analysis_id,
              predicted_stage: 'CRITICAL_ANOMALY',
              forecast: [
                {
                  step_number: 1,
                  timestamp: '2026-09-04T12:00:00Z',
                  forecast_value: 850.5,
                  lower_bound: 800.0,
                  upper_bound: 900.0,
                },
                {
                  step_number: 2,
                  timestamp: '2026-09-04T12:05:00Z',
                  forecast_value: 920.0,
                  lower_bound: 870.0,
                  upper_bound: 970.0,
                },
              ],
              explanation: ['High burst frequency detected at step 1', 'DDoS signature anomaly'],
            })
          );
        }, delay);
      });
      return;
    }

    res.writeHead(404).end();
  });

  await new Promise<void>((resolve) => mockMLServer.listen(0, () => resolve()));
  const mockMLPort = (mockMLServer.address() as AddressInfo).port;
  const originalMLUrl = env.ML_SERVICE_URL;
  env.ML_SERVICE_URL = `http://localhost:${mockMLPort}`;

  // Supabase isolated test client
  const clientAuth = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // State
  let userAId = '';
  let userBId = '';
  let tokenA = '';
  let tokenB = '';
  let datasetAId = '';
  let datasetBId = '';
  let analysisA1Id = '';
  let analysisA2Id = '';

  try {
    // -------------------------------------------------------------
    // PHASE A: System Setup & Auth
    // -------------------------------------------------------------
    console.log('\n[Phase A] Setup Test Identities');

    await testStep('Create User A & User B via Supabase Auth', async () => {
      const emailA = `test_e2e_a_${Date.now()}@nexguard.test`;
      const emailB = `test_e2e_b_${Date.now()}@nexguard.test`;
      const pwd = 'TestPassword123!';

      const { data: createA } = await supabase.auth.admin.createUser({ email: emailA, password: pwd, email_confirm: true });
      userAId = createA.user!.id;

      const { data: createB } = await supabase.auth.admin.createUser({ email: emailB, password: pwd, email_confirm: true });
      userBId = createB.user!.id;

      await supabase.from('profiles').upsert([
        { id: userAId, email: emailA, full_name: 'E2E User A' },
        { id: userBId, email: emailB, full_name: 'E2E User B' },
      ]);

      const { data: signA } = await clientAuth.auth.signInWithPassword({ email: emailA, password: pwd });
      const { data: signB } = await clientAuth.auth.signInWithPassword({ email: emailB, password: pwd });

      tokenA = signA.session!.access_token;
      tokenB = signB.session!.access_token;

      assert(Boolean(tokenA && tokenB), 'Tokens must be received');
    });

    // -------------------------------------------------------------
    // PHASE B: Health & Public Endpoints
    // -------------------------------------------------------------
    console.log('\n[Phase B] Public Health & ML Health Checks');

    await testStep('GET /api/v1/health (Public Health)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`);
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.data?.status === 'ok', 'Expected data.status === "ok"');
      assert(body.data?.database?.connected === true, 'Database should be connected');
    });

    await testStep('GET /api/v1/health/ml (Protected ML Health)', async () => {
      // Unauthenticated
      const unauthRes = await fetch(`${baseUrl}/api/v1/health/ml`);
      assert(unauthRes.status === 401, 'Unauthenticated check must return 401');

      // Authenticated with mock ML running
      const authRes = await fetch(`${baseUrl}/api/v1/health/ml`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const body = await authRes.json();
      assert(authRes.status === 200, `Expected 200, got ${authRes.status}`);
      assert(body.data?.mlService?.reachable === true, 'ML service should be reported reachable');
    });

    // -------------------------------------------------------------
    // PHASE C: Authentication Endpoint Verification
    // -------------------------------------------------------------
    console.log('\n[Phase C] Authentication Endpoint (GET /api/v1/auth/me)');

    await testStep('GET /api/v1/auth/me (Auth Guards & Identity)', async () => {
      // Missing token
      const noTokenRes = await fetch(`${baseUrl}/api/v1/auth/me`);
      assert(noTokenRes.status === 401, 'Must reject missing token');

      // Invalid token
      const badTokenRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: 'Bearer fake-invalid-token' },
      });
      assert(badTokenRes.status === 401, 'Must reject invalid token');

      // Valid token User A
      const validRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const body = await validRes.json();
      assert(validRes.status === 200, 'Must return 200 for valid token');
      assert(body.data?.user?.id === userAId, 'Must return matching User A ID');
    });

    // -------------------------------------------------------------
    // PHASE D: Dataset Upload, Storage & Ownership Isolation
    // -------------------------------------------------------------
    console.log('\n[Phase D] Dataset Upload & Ownership Isolation');

    await testStep('POST /api/v1/datasets validation (Missing & Non-CSV files)', async () => {
      // Missing file
      const noFileForm = new FormData();
      const resNoFile = await fetch(`${baseUrl}/api/v1/datasets`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: noFileForm,
      });
      assert(resNoFile.status === 400, 'Must reject empty form data with 400');

      // Non-CSV file
      const txtForm = new FormData();
      txtForm.append('file', new Blob(['plain text'], { type: 'text/plain' }), 'test.txt');
      const resTxt = await fetch(`${baseUrl}/api/v1/datasets`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: txtForm,
      });
      const txtBody = await resTxt.json();
      assert(resTxt.status === 400, 'Must reject non-CSV file with 400');
      assert(txtBody.error?.code === 'VALIDATION_ERROR', 'Expected VALIDATION_ERROR code');
    });

    await testStep('POST /api/v1/datasets (Valid CSV Upload for User A & User B)', async () => {
      // User A Upload
      const csvContentA = 'timestamp,bytes\n2026-09-04T12:00:00Z,1500\n';
      const formA = new FormData();
      formA.append('file', new Blob([csvContentA], { type: 'text/csv' }), 'user_a_traffic.csv');

      const resA = await fetch(`${baseUrl}/api/v1/datasets`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: formA,
      });
      const bodyA = await resA.json();
      assert(resA.status === 201, `Expected 201 for User A, got ${resA.status}`);
      assert(Boolean(bodyA.data?.id), 'Expected dataset ID');
      assert(bodyA.data?.filename === 'user_a_traffic.csv', 'Filename should match');
      datasetAId = bodyA.data.id;

      // User B Upload
      const csvContentB = 'timestamp,bytes\n2026-09-04T12:00:00Z,3200\n';
      const formB = new FormData();
      formB.append('file', new Blob([csvContentB], { type: 'text/csv' }), 'user_b_traffic.csv');

      const resB = await fetch(`${baseUrl}/api/v1/datasets`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: formB,
      });
      const bodyB = await resB.json();
      assert(resB.status === 201, `Expected 201 for User B, got ${resB.status}`);
      datasetBId = bodyB.data.id;
    });

    await testStep('GET /api/v1/datasets (Scoping to Authenticated User)', async () => {
      const resA = await fetch(`${baseUrl}/api/v1/datasets`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const bodyA = await resA.json();
      assert(resA.status === 200, 'User A should list datasets');
      const idsA = bodyA.data.map((d: any) => d.id);
      assert(idsA.includes(datasetAId), 'User A dataset list must contain datasetA');
      assert(!idsA.includes(datasetBId), 'User A dataset list must NOT contain datasetB');
    });

    await testStep('GET /api/v1/datasets/:id (Single Dataset & Cross-User Protection)', async () => {
      // User A accesses own dataset
      const resOwn = await fetch(`${baseUrl}/api/v1/datasets/${datasetAId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert(resOwn.status === 200, 'User A should access own dataset');

      // User B attempts to access User A dataset
      const resCross = await fetch(`${baseUrl}/api/v1/datasets/${datasetAId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const crossBody = await resCross.json();
      assert(resCross.status === 404, 'Must return 404 on cross-user dataset access');
      assert(crossBody.error?.code === 'NOT_FOUND', 'Expected NOT_FOUND code');

      // Invalid UUID
      const resBadId = await fetch(`${baseUrl}/api/v1/datasets/not-a-uuid`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert(resBadId.status === 400, 'Invalid UUID must return 400');
    });

    // -------------------------------------------------------------
    // PHASE E: Analysis Creation & Validation
    // -------------------------------------------------------------
    console.log('\n[Phase E] Analysis Creation & Lifecycle Validation');

    await testStep('POST /api/v1/analyses validation (Input constraints & Cross-user dataset)', async () => {
      // Invalid horizon
      const badHorizonRes = await fetch(`${baseUrl}/api/v1/analyses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: datasetAId, horizon: -1 }),
      });
      assert(badHorizonRes.status === 400, 'Horizon <= 0 must be rejected with 400');

      // Nonexistent dataset ID
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const fakeDsRes = await fetch(`${baseUrl}/api/v1/analyses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: fakeUuid, horizon: 5 }),
      });
      assert(fakeDsRes.status === 404, 'Nonexistent dataset must return 404');

      // User A attempts to create analysis with User B dataset
      const crossDsRes = await fetch(`${baseUrl}/api/v1/analyses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: datasetBId, horizon: 5 }),
      });
      assert(crossDsRes.status === 404, 'Cannot create analysis using another user dataset (404)');
    });

    await testStep('POST /api/v1/analyses (Valid creation starts in PENDING)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/analyses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: datasetAId, horizon: 5 }),
      });
      const body = await res.json();
      assert(res.status === 201, 'Analysis creation must return 201');
      assert(body.data?.status === 'PENDING', 'Analysis must start in PENDING status');
      assert(body.data?.datasetId === datasetAId, 'Analysis datasetId must match');
      analysisA1Id = body.data.id;
    });

    await testStep('GET /api/v1/analyses & GET /api/v1/analyses/:id', async () => {
      // User A list
      const listRes = await fetch(`${baseUrl}/api/v1/analyses`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const listBody = await listRes.json();
      assert(listRes.status === 200, 'Must return 200 for analyses list');
      assert(Array.isArray(listBody.data), 'data must be an array');
      assert(Boolean(listBody.pagination), 'pagination metadata must exist');

      // User A get by ID
      const getRes = await fetch(`${baseUrl}/api/v1/analyses/${analysisA1Id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const getBody = await getRes.json();
      assert(getRes.status === 200, 'Must return 200 for single analysis');
      assert(getBody.data?.id === analysisA1Id, 'ID must match');

      // User B attempts to get User A analysis
      const crossRes = await fetch(`${baseUrl}/api/v1/analyses/${analysisA1Id}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert(crossRes.status === 404, 'User B must get 404 for User A analysis');
    });

    // -------------------------------------------------------------
    // PHASE F: Asynchronous Execution, Background Worker & Persistence
    // -------------------------------------------------------------
    console.log('\n[Phase F] Asynchronous Processing & Result Persistence');

    await testStep('POST /api/v1/analyses/:id/run (Immediate non-blocking transition to PROCESSING)', async () => {
      mockMLBehavior = 'DELAY_SUCCESS';

      // Unauthorized user check
      const crossRun = await fetch(`${baseUrl}/api/v1/analyses/${analysisA1Id}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert(crossRun.status === 404, 'Cross-user run must return 404');

      // Valid run
      const startTime = Date.now();
      const runRes = await fetch(`${baseUrl}/api/v1/analyses/${analysisA1Id}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const elapsed = Date.now() - startTime;
      const runBody = await runRes.json();

      assert(runRes.status === 200, `Expected 200 on run, got ${runRes.status}`);
      assert(runBody.data?.status === 'PROCESSING', 'Status must be PROCESSING');
      assert(elapsed < 1000, `Run endpoint must return quickly (<1s), took ${elapsed}ms`);
    });

    await testStep('Duplicate execution prevention while PROCESSING', async () => {
      // Calling /run again immediately must be rejected
      const dupRes = await fetch(`${baseUrl}/api/v1/analyses/${analysisA1Id}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert(dupRes.status === 400 || dupRes.status === 409, `Duplicate run must fail with 400/409, got ${dupRes.status}`);
    });

    await testStep('Background execution reaches COMPLETED & persists results', async () => {
      let finalStatus = 'PROCESSING';
      for (let i = 0; i < 25; i++) {
        await new Promise((r) => setTimeout(r, 80));
        const pollRes = await fetch(`${baseUrl}/api/v1/analyses/${analysisA1Id}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        });
        const pollBody = await pollRes.json();
        finalStatus = pollBody.data?.status;
        if (finalStatus === 'COMPLETED' || finalStatus === 'FAILED') break;
      }
      assert(finalStatus === 'COMPLETED', `Expected analysis to reach COMPLETED, got ${finalStatus}`);
    });

    await testStep('GET /api/v1/analyses/:id/forecast (Results check & Scoping)', async () => {
      // User A accesses forecast
      const fcRes = await fetch(`${baseUrl}/api/v1/analyses/${analysisA1Id}/forecast`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const fcBody = await fcRes.json();
      assert(fcRes.status === 200, 'Must return 200 for forecast');
      assert(Array.isArray(fcBody.data?.forecast), 'forecast must be an array');
      assert(fcBody.data.forecast.length === 2, 'forecast should have 2 steps');
      assert(fcBody.data.forecast[0].stepNumber === 1, 'First step number should be 1');

      // User B cross-access
      const crossFc = await fetch(`${baseUrl}/api/v1/analyses/${analysisA1Id}/forecast`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert(crossFc.status === 404, 'User B must get 404 on forecast');
    });

    await testStep('GET /api/v1/analyses/:id/explanation (Results check & Scoping)', async () => {
      // User A accesses explanation
      const expRes = await fetch(`${baseUrl}/api/v1/analyses/${analysisA1Id}/explanation`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const expBody = await expRes.json();
      assert(expRes.status === 200, 'Must return 200 for explanation');
      assert(Boolean(expBody.data?.explanation?.summary), 'summary should exist');
      assert(Array.isArray(expBody.data?.explanation?.insights), 'insights must be an array');

      // User B cross-access
      const crossExp = await fetch(`${baseUrl}/api/v1/analyses/${analysisA1Id}/explanation`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert(crossExp.status === 404, 'User B must get 404 on explanation');
    });

    // -------------------------------------------------------------
    // PHASE G: Background Failure Handling (Transitions to FAILED)
    // -------------------------------------------------------------
    console.log('\n[Phase G] Background Error Handling & Graceful Failure');

    await testStep('ML failure transitions analysis cleanly to FAILED (not stuck in PROCESSING)', async () => {
      mockMLBehavior = 'ERROR_500';

      // Create a second analysis
      const createRes = await fetch(`${baseUrl}/api/v1/analyses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: datasetAId, horizon: 5 }),
      });
      const createBody = await createRes.json();
      analysisA2Id = createBody.data.id;

      // Trigger run
      const runRes = await fetch(`${baseUrl}/api/v1/analyses/${analysisA2Id}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert(runRes.status === 200, 'Run should initiate');

      // Poll until finished
      let status2 = 'PROCESSING';
      for (let i = 0; i < 25; i++) {
        await new Promise((r) => setTimeout(r, 80));
        const poll = await fetch(`${baseUrl}/api/v1/analyses/${analysisA2Id}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        });
        const body = await poll.json();
        status2 = body.data?.status;
        if (status2 === 'FAILED' || status2 === 'COMPLETED') break;
      }
      assert(status2 === 'FAILED', `Analysis must transition to FAILED on ML error, got ${status2}`);
    });

    // -------------------------------------------------------------
    // PHASE H: Security, Leakage & Error Shape Integrity
    // -------------------------------------------------------------
    console.log('\n[Phase H] Error Shape & Security Sanitization');

    await testStep('Verify error shapes and absence of secret/stack leaks', async () => {
      const notFoundRes = await fetch(`${baseUrl}/api/v1/non-existent-route`);
      const notFoundBody = await notFoundRes.json();

      assert(notFoundRes.status === 404, 'Should be 404');
      assert(Boolean(notFoundBody.error?.code), 'Error code must exist');
      assert(Boolean(notFoundBody.error?.message), 'Error message must exist');
      assert(!notFoundBody.stack, 'Stack trace must NEVER be present in response');
      assert(!notFoundBody.details, 'Internal details must not leak');
    });

    console.log('\n================================================================');
    console.log(`🎉 ALL INTEGRATION TESTS PASSED: ${passedCount} passed, 0 failed.`);
    console.log('================================================================\n');
  } finally {
    console.log('Cleaning up test resources...');
    env.ML_SERVICE_URL = originalMLUrl;

    if (mockMLServer) mockMLServer.close();

    // Database and storage cleanup
    if (analysisA1Id) {
      await supabase.from('forecast_steps').delete().eq('analysis_id', analysisA1Id);
      await supabase.from('explanations').delete().eq('analysis_id', analysisA1Id);
      await supabase.from('analyses').delete().eq('id', analysisA1Id);
    }
    if (analysisA2Id) {
      await supabase.from('analyses').delete().eq('id', analysisA2Id);
    }
    if (datasetAId) {
      await supabase.from('datasets').delete().eq('id', datasetAId);
      await supabase.storage.from('datasets').remove([`${userAId}/${datasetAId}/original.csv`]);
    }
    if (datasetBId) {
      await supabase.from('datasets').delete().eq('id', datasetBId);
      await supabase.storage.from('datasets').remove([`${userBId}/${datasetBId}/original.csv`]);
    }
    if (userAId) {
      await supabase.from('profiles').delete().eq('id', userAId);
      await supabase.auth.admin.deleteUser(userAId);
    }
    if (userBId) {
      await supabase.from('profiles').delete().eq('id', userBId);
      await supabase.auth.admin.deleteUser(userBId);
    }

    appServer.close();
  }
}

runAllIntegrationTests().catch((err) => {
  console.error('\n❌ Fatal Test Suite Failure:\n', err);
  process.exit(1);
});
