# NexGuard — Production Deployment & Cloud Architecture Guide

This document outlines the step-by-step production deployment strategy for the NexGuard AI-Powered Network Anomaly Detection platform.

---

## 1. System Topology & Service Boundaries

```text
                                       Client Browser
                                             │
                                             ▼ HTTPS
                                     Next.js Frontend
                                   (Hosted on Vercel)
                                             │
                                             ▼ HTTPS REST API
                                 Node.js Express Backend
                     (Hosted on Render / Railway / Fly.io / Docker)
                                   │                   │
                     HTTPS (JSON)  │                   │ Supabase JS SDK
                                   ▼                   ▼
                       External FastAPI ML          Supabase Cloud
                        (AI Team Host)           (Auth/DB/Storage)
```

### Component Responsibilities

| Service | Hosting Target | Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | Vercel / Netlify | Next.js UI rendering, client state management, browser authentication session handling. |
| **Backend** | Render / Railway / Fly.io | Request validation, Auth token verification, Storage object pathing, analysis lifecycle orchestration. |
| **Supabase** | Supabase Cloud | PostgreSQL database, Row Level Security (RLS), Supabase Auth, private `datasets` object storage. |
| **ML Service** | AI Team Container Host | Time-series forecasting, anomaly classification, PyTorch model execution. |

---

## 2. Environment Variables Matrix

### A. Public / Browser Environment Variables (Frontend / Vercel)
> [!CAUTION]
> Only include `NEXT_PUBLIC_*` variables in frontend build environments. Never expose server secrets to Vercel/browser environments.

| Environment Variable | Example Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://api.nexguard.app/api/v1` | Production URL of the Node.js REST API. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ylcpdplxmdztvhiwwxna.supabase.co` | Public Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJKV1QiLC...` | Public Supabase anon key for browser auth. |

### B. Server-Only Secrets (Backend / Hosting Provider)
> [!IMPORTANT]
> Configure these variables strictly within your backend hosting provider's secret dashboard.

| Environment Variable | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Sets Node runtime environment mode. |
| `PORT` | `5001` | Server binding port (automatically assigned by cloud providers). |
| `FRONTEND_URL` | `https://nexguard.vercel.app` | Allowed frontend origin for CORS restriction. |
| `CORS_ORIGIN` | `https://nexguard.vercel.app` | Secondary allowed origin for CORS. |
| `SUPABASE_URL` | `https://ylcpdplxmdztvhiwwxna.supabase.co` | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJKV1QiLC...` | Privileged Supabase service-role key (**Backend ONLY**). |
| `SUPABASE_STORAGE_BUCKET` | `datasets` | Name of private storage bucket. |
| `MAX_FILE_SIZE_BYTES` | `52428800` | Maximum upload size limit (50MB). |
| `ML_SERVICE_URL` | `https://ml.nexguard.app` | HTTPS URL of the external FastAPI service. |
| `ML_SERVICE_TIMEOUT_MS` | `10000` | HTTP request timeout in milliseconds (10s). |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limiting window (15 minutes). |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Request limit per IP window. |

---

## 3. Frontend Deployment (Next.js on Vercel)

1. Connect your GitHub repository to **Vercel**.
2. Select the `frontend` root directory during project import.
3. Configure Environment Variables under **Vercel Project Settings $\rightarrow$ Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = `https://<your-backend-domain>/api/v1`
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<your-project>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<your-anon-key>`
4. Trigger production build (`npm run build`).

---

## 4. Backend Deployment (Node.js Docker Container)

### Render / Railway / Fly.io Setup

1. Create a new **Web Service** in your hosting dashboard connected to your GitHub repository.
2. Set root directory to `backend`.
3. Choose **Docker** as the environment (uses [`backend/Dockerfile`](file:///Users/priyanshukashyap/Desktop/SIH%202026/backend/Dockerfile)).
4. Configure environment variables listed in Section 2B.
5. Set Health Check path to `/api/v1/health`.
6. Verify deployment status using:
   ```bash
   curl -i https://<your-backend-domain>/api/v1/health
   ```

---

## 5. External FastAPI Integration Boundary for AI Team

The Node.js backend connects to the AI team's external FastAPI ML service over HTTP/HTTPS using `ML_SERVICE_URL`.

### Expectations Required from AI Team

1. **Service URL**: HTTPS address configured via `ML_SERVICE_URL` (e.g. `https://ml.nexguard.app`).
2. **Prediction Endpoint**: `POST /predict` accepting request payload:
   ```json
   {
     "analysis_id": "uuid",
     "dataset_reference": "userId/datasetId/original.csv",
     "horizon": 5
   }
   ```
3. **Prediction Response**: `200 OK` returning response payload:
   ```json
   {
     "analysis_id": "uuid",
     "predicted_stage": "CRITICAL_ANOMALY",
     "forecast": [
       { "step_number": 1, "timestamp": "ISO-8601", "forecast_value": 1250.0, "lower_bound": 1100.0, "upper_bound": 1400.0 }
     ],
     "explanation": [ "DDoS traffic burst detected at step 1" ]
   }
   ```
4. **Health Endpoint**: `GET /health` returning `{ "status": "ok" }`.

---

## 6. Supabase Production Database & Storage Setup

1. **Execute Schema Migration**:
   Run migration script [`backend/supabase/migrations/20260903000000_init_schema.sql`](file:///Users/priyanshukashyap/Desktop/SIH%202026/backend/supabase/migrations/20260903000000_init_schema.sql) in your Supabase SQL Editor.
2. **Verify Row Level Security (RLS)**:
   Ensure RLS policies are enabled on `profiles`, `datasets`, `analyses`, `forecast_steps`, and `explanations`.
3. **Configure Storage Bucket**:
   Create a private storage bucket named `datasets`.
4. **Auth Redirect URLs**:
   Add `https://<your-frontend-domain>` to Supabase Auth Site URL and Allowed Redirect URLs.

---

## 7. Post-Deployment End-to-End Health Verification

Run the following post-deployment checklist to confirm environment stability:

```bash
# 1. Verify Backend Health Endpoint (Returns 200 OK)
curl https://<your-backend-domain>/api/v1/health

# 2. Verify Authenticated User Check (Returns 401 Unauthorized without token)
curl -i https://<your-backend-domain>/api/v1/auth/me

# 3. Verify ML Service Reachability Endpoint (Protected)
curl -H "Authorization: Bearer <user-token>" https://<your-backend-domain>/api/v1/health/ml
```

---

## 8. Common Deployment Failures & Troubleshooting

| Error | Root Cause | Solution |
| :--- | :--- | :--- |
| **CORS Error (`403 FORBIDDEN`)** | Mismatch between client domain and `FRONTEND_URL` environment variable. | Update `FRONTEND_URL` in backend hosting environment settings to match exact frontend domain. |
| **`504 Gateway Timeout` on ML Run** | FastAPI ML service took longer than 10,000ms to return predictions. | Check AI team ML service logs or adjust `ML_SERVICE_TIMEOUT_MS`. |
| **`503 Service Unavailable`** | Backend cannot resolve or connect to `ML_SERVICE_URL`. | Verify `ML_SERVICE_URL` HTTPS domain and ensure FastAPI container is running. |
| **`404 NOT_FOUND` on Resource Query** | Resource belongs to another user or dataset ID is invalid. | Verify request authorization header and user ownership scoping. |
