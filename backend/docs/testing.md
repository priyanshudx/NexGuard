# NexGuard Backend Testing & Demo Reliability Guide

This document details the automated testing strategy, execution commands, and environment configuration for validating the NexGuard backend.

---

## 1. Test Architecture Overview

The test suite is divided into two distinct tiers:

1. **API Integration Test Suite (`npm test` / `tests/integration/api.test.ts`)**:
   - Runs on ephemeral ports to avoid port collision.
   - Connects to Supabase Auth, PostgreSQL, and Storage to test real database persistence and user isolation.
   - Mocks the external FastAPI HTTP boundary to test deterministic ML behaviors (200 success, 500 error, malformed response, timeout) without requiring the AI team's service to be running.
2. **Real ML Service Smoke Test (`npm run test:integration` / `tests/integration/ml-smoke.test.ts`)**:
   - Points directly to the actual FastAPI service configured by `ML_SERVICE_URL`.
   - Validates live `/health` reachability and `/predict` JSON contract conformance.
   - Gracefully skips if the external FastAPI service has not yet been started by the AI team.

---

## 2. Test Commands

Run from the `backend/` directory:

```bash
# Run the complete API integration test suite (18 test scenarios)
npm test

# Run the real external FastAPI ML service integration smoke test
npm run test:integration

# Run all test suites in sequence
npm run test:all
```

---

## 3. What is Mocked vs. What is Real

| Component | In `npm test` | In `npm run test:integration` |
| :--- | :--- | :--- |
| **Express REST Routing & Middleware** | **Real** (app instance on ephemeral port) | N/A (client-only test) |
| **Supabase Authentication** | **Real** (Supabase Auth API) | N/A |
| **Supabase PostgreSQL Database** | **Real** (live tables & RLS policies) | N/A |
| **Supabase Private Object Storage** | **Real** (`datasets` storage bucket) | N/A |
| **FastAPI ML Service Boundary** | **Mocked** (controlled HTTP server) | **Real** (connects to `ML_SERVICE_URL`) |

---

## 4. Environment Variables for Testing

The tests automatically load credentials from `backend/.env`.

| Variable | Description | Default for Test |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Supabase Project URL | Configured in `backend/.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Admin / Service Role Key | Configured in `backend/.env` |
| `ML_SERVICE_URL` | Target URL for external FastAPI service | `http://localhost:8000` |
| `ML_SERVICE_TIMEOUT_MS` | ML HTTP request timeout | `10000` (10 seconds) |

---

## 5. How to Test Against the AI Team's Live FastAPI Service

When the AI team has their FastAPI service ready:

1. Start their FastAPI service (or start their Docker container):
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
2. Configure `ML_SERVICE_URL` in your environment:
   ```bash
   export ML_SERVICE_URL=http://localhost:8000
   ```
3. Run the live integration smoke test:
   ```bash
   npm run test:integration
   ```

The smoke test will:
- Check `GET /health` reachability.
- Dispatch a sample prediction payload:
  ```json
  {
    "analysis_id": "00000000-0000-0000-0000-000000000001",
    "dataset_reference": "smoke-test/sample.csv",
    "horizon": 5
  }
  ```
- Validate that the response satisfies `mlPredictResponseSchema` (`predicted_stage`, `forecast`, `explanation`).

---

## 6. Full Demonstration Reliability Checklist

The test suite validates the entire demonstration pipeline:

1. **Authentication**: `GET /api/v1/auth/me` with Bearer JWT.
2. **Dataset Upload**: Multipart CSV upload to private Supabase Storage at `${userId}/${datasetId}/original.csv`.
3. **Dataset Ownership**: Prevents cross-user dataset access with `404 NOT_FOUND`.
4. **Analysis Creation**: Associates analysis with owned dataset, begins in `PENDING` status.
5. **Asynchronous Execution (`/run`)**: Atomically shifts to `PROCESSING` and returns HTTP `200` immediately without waiting for inference.
6. **Duplicate Execution Prevention**: Multiple concurrent `/run` calls fail with `400`/`409`.
7. **Background Worker & Persistence**: Background task calls ML client, stores forecast steps and explanations into PostgreSQL, and marks analysis `COMPLETED`.
8. **Fault Recovery**: ML timeouts or 500 errors gracefully mark analysis `FAILED` instead of hanging in `PROCESSING`.
9. **Result Endpoints**:
   - `GET /api/v1/analyses/:id/forecast` returns time-series forecast steps.
   - `GET /api/v1/analyses/:id/explanation` returns anomaly insights.
