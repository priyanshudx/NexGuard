import { env } from '../../src/config/env';
import { checkMLServiceHealth, sendPredictRequest } from '../../src/lib/ml-client';

/**
 * Real FastAPI ML Service Smoke Test
 *
 * This test is designed to verify connectivity and integration with the actual
 * external FastAPI ML service deployed by the AI team at ML_SERVICE_URL.
 *
 * If the service is running, it validates:
 *  1. GET /health reachability
 *  2. POST /predict contract conformity
 *
 * If the service is NOT currently running, it gracefully reports the status
 * and exits with clean diagnostics without blocking local/offline development.
 */
async function runMLSmokeTest() {
  console.log('\n================================================================');
  console.log('       REAL FASTAPI ML SERVICE INTEGRATION SMOKE TEST           ');
  console.log('================================================================\n');

  console.log(`Target ML_SERVICE_URL: ${env.ML_SERVICE_URL}`);
  console.log(`Configured Timeout:    ${env.ML_SERVICE_TIMEOUT_MS}ms\n`);

  console.log('Checking health of the external FastAPI service...');
  const healthStatus = await checkMLServiceHealth();

  if (!healthStatus.reachable) {
    console.log('\n⚠️  [STATUS: SKIPPED / PENDING AI TEAM DEPLOYMENT]');
    console.log(`The external FastAPI service at "${env.ML_SERVICE_URL}" is not currently reachable.`);
    console.log('Reason: The AI team has not yet started or deployed the FastAPI service.');
    console.log('\nTo run this test against a live ML service:');
    console.log('  1. Start the FastAPI service (e.g. uvicorn app.main:app --port 8000)');
    console.log('  2. Set ML_SERVICE_URL in your environment (e.g. export ML_SERVICE_URL=http://localhost:8000)');
    console.log('  3. Re-run: npm run test:integration\n');
    return;
  }

  console.log('✅ FastAPI service is REACHABLE:');
  console.log(`   Status:      ${healthStatus.status}`);
  console.log(`   Response ms: ${healthStatus.durationMs}ms\n`);

  console.log('Verifying prediction contract boundary (POST /predict)...');
  try {
    const testAnalysisId = '00000000-0000-0000-0000-000000000001';
    const samplePayload = {
      analysis_id: testAnalysisId,
      dataset_reference: 'smoke-test/sample.csv',
      horizon: 5,
    };

    const response = await sendPredictRequest(samplePayload);
    console.log('✅ Received valid prediction response conforming to contract:');
    console.log(`   Analysis ID:     ${response.analysis_id}`);
    console.log(`   Predicted Stage: ${response.predicted_stage || 'N/A'}`);
    console.log(`   Forecast Steps:  ${response.forecast?.length || 0}`);
    console.log(`   Explanation:     ${JSON.stringify(response.explanation || [])}\n`);
    console.log('🎉 REAL FASTAPI ML SERVICE SMOKE TEST PASSED!');
  } catch (err: any) {
    console.error('❌ FastAPI prediction contract validation failed:', err.message || err);
    process.exit(1);
  }
}

runMLSmokeTest().catch((err) => {
  console.error('Unexpected smoke test error:', err);
  process.exit(1);
});
