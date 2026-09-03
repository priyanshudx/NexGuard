# NexGuard — FastAPI ML Service Integration Contract

## 1. Ownership & Architecture Boundary

- **Node.js Backend (REST API)**: Owned by the Backend Team. Handles user authentication, database persistence (Supabase PostgreSQL), dataset object storage (Supabase Storage), and request orchestration.
- **FastAPI ML Service**: Owned strictly by the **AI Team**. Handles dataset loading, feature preprocessing, time-series forecasting, anomaly stage classification, and model explainability.

```text
Next.js Frontend
       │
       ▼
Node.js REST Backend  ─────────►  Supabase (Auth/DB/Storage)
       │ HTTP (JSON)
       ▼
External FastAPI ML Service
       │
       ▼
AI Team ML Implementation (PyTorch / Transformers)
```

---

## 2. Configuration & Environment Variables

The backend connects to the external FastAPI service using the following environment variable:

```env
# URL of the external FastAPI ML service (configured per environment)
ML_SERVICE_URL=http://localhost:8000

# HTTP Request Timeout (in milliseconds, default 10000ms = 10s)
ML_SERVICE_TIMEOUT_MS=10000
```

> [!IMPORTANT]
> Never hardcode `localhost` or production URLs in application code. Always retrieve `ML_SERVICE_URL` from environment configuration ([`src/config/env.ts`](file:///Users/priyanshukashyap/Desktop/SIH%202026/backend/src/config/env.ts)).

---

## 3. Endpoints & Contract Placeholders

All HTTP calls to the FastAPI service are encapsulated within [`src/lib/ml-client.ts`](file:///Users/priyanshukashyap/Desktop/SIH%202026/backend/src/lib/ml-client.ts).

### A. Prediction Endpoint: `POST /predict`

- **Request Payload** (sent by Node.js backend):
  ```json
  {
    "analysis_id": "550e8400-e29b-41d4-a716-446655440000",
    "dataset_reference": "user_id/dataset_id/original.csv",
    "horizon": 5
  }
  ```
  *Note: To optimize performance with large network datasets, the backend sends a secure dataset storage path reference (`dataset_reference`) rather than transmitting raw CSV buffers over HTTP.*

- **Response Payload** (returned by FastAPI service):
  ```json
  {
    "analysis_id": "550e8400-e29b-41d4-a716-446655440000",
    "predicted_stage": "HIGH_ANOMALY",
    "forecast": [
      {
        "step_number": 1,
        "timestamp": "2026-09-03T12:00:00Z",
        "forecast_value": 450.2,
        "lower_bound": 400.0,
        "upper_bound": 500.0
      }
    ],
    "explanation": [
      "High packet burst detected at step 1"
    ]
  }
  ```

### B. Health Endpoint: `GET /health`

- **Response Payload**:
  ```json
  {
    "status": "ok"
  }
  ```

---

## 4. Timeout & Error Handling Strategy

The Node.js backend handles communication failures gracefully without leaking raw Python stack traces to clients:

| Communication Error | Backend Error Code | HTTP Status | User Message |
| :--- | :--- | :--- | :--- |
| **Request Timeout** (>10s) | `504 Gateway Timeout` | `504` | `"ML service request timed out"` |
| **Connection Refused / Service Down** | `503 Service Unavailable` | `503` | `"ML service unavailable"` |
| **FastAPI 5xx/4xx Error Response** | `502 Bad Gateway` | `502` | `"ML service returned an error response"` |
| **Malformed JSON / Schema Mismatch** | `502 Bad Gateway` | `502` | `"ML service returned invalid response format"` |

---

## 5. Integration Workflow in Backend

1. Client creates analysis via `POST /api/v1/analyses` $\rightarrow$ record created in state `PENDING`.
2. Analysis execution is triggered via `executeAnalysisPipeline(analysisId, userId)`:
   - Sets status to `PROCESSING`.
   - Calls `sendPredictRequest(...)` via ML client.
   - On success: Persists returned forecast steps into `forecast_steps` table and explanation summaries into `explanations` table, then sets status to `COMPLETED`.
   - On error: Sets status to `FAILED` and logs operational error details.
