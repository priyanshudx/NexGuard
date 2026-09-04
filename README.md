# NexGuard — AI-Powered Network Anomaly Detection Platform

NexGuard is an enterprise-grade AI network security system providing time-series anomaly forecasting, threat classification, and explainability for network traffic datasets.

---

## 1. System Architecture & Ownership Boundaries

```text
Next.js Frontend (React/TypeScript)
       │
       ▼  REST API (JSON)
Node.js Express Backend (TypeScript)  ────────►  Supabase (Auth, PostgreSQL DB, Storage)
       │
       ▼  HTTP / REST Boundary (JSON)
FastAPI ML Service (Python / AI Team) ────────►  PyTorch / Transformer Models
```

- **Node.js REST Backend** (`/backend`): Handles request validation, JWT authentication (Supabase Auth), storage path generation (Supabase Storage), and asynchronous analysis job orchestration.
- **FastAPI ML Service** (`/ml-service`): Owned strictly by the **AI Team**. Executes dataset loading, feature preprocessing, time-series forecasting, and model explainability.
- **Supabase Cloud / Self-Hosted**: Manages PostgreSQL database, Row Level Security (RLS) policies, and encrypted object storage for dataset CSV files.

---

## 2. Environment Variables & Security Configuration

Copy the example environment configuration before running the stack:

```bash
cp .env.example .env
```

### Environment Variable Classification

| Variable Type | Examples | Description |
| :--- | :--- | :--- |
| **Public / Browser-facing** | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe for client-side JavaScript bundling. |
| **Server-Only Secrets** | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `ML_SERVICE_URL` | **Backend only**. Never expose to frontend or browser code. |

---

## 3. Local Docker Setup & Quickstart

### Prerequisites
- [Docker](https://www.docker.com/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)

### A. Run Stack in Production Mode

```bash
# Build and launch all services in detached mode
docker compose up --build -d

# Verify backend health status
curl http://localhost:5001/api/v1/health
```

### B. Run Stack in Development Mode (Live Hot-Reloading)

```bash
# Launch with dev overrides and live source-code mounting
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

---

## 4. API Endpoints Overview

All REST API endpoints are served under `/api/v1`:

- **Health Checks**:
  - `GET /api/v1/health` (Public backend health status)
  - `GET /api/v1/health/ml` (Protected ML service reachability check)
- **Authentication**:
  - `GET /api/v1/auth/me` (Authenticated identity check)
- **Datasets**:
  - `POST /api/v1/datasets` (Multipart CSV file upload)
  - `GET /api/v1/datasets` (List user datasets)
  - `GET /api/v1/datasets/:id` (Get single dataset details)
- **Analyses**:
  - `POST /api/v1/analyses` (Create analysis job in `PENDING` state)
  - `GET /api/v1/analyses` (List user analyses)
  - `GET /api/v1/analyses/:id` (Get analysis status)
  - `POST /api/v1/analyses/:id/run` (Atomically run analysis asynchronously)
- **Results**:
  - `GET /api/v1/analyses/:id/forecast` (Retrieve time-series forecast steps)
  - `GET /api/v1/analyses/:id/explanation` (Retrieve anomaly insights summary)

See [`backend/docs/api.md`](file:///Users/priyanshukashyap/Desktop/SIH%202026/backend/docs/api.md) for full API specifications.

---

## 5. Production Deployment Guide

For complete production cloud deployment instructions (Vercel, Render, Railway, Fly.io, Supabase, and FastAPI ML Service Integration), see the detailed deployment documentation:

👉 **[`backend/docs/deployment.md`](file:///Users/priyanshukashyap/Desktop/SIH%202026/backend/docs/deployment.md)**

---

## 6. Offline Demonstration & SIH Competition Architecture

For offline or air-gapped SIH competition environments:
1. **Database Boundary**: Supabase access is strictly encapsulated within [`backend/src/lib/supabase.ts`](file:///Users/priyanshukashyap/Desktop/SIH%202026/backend/src/lib/supabase.ts).
2. **ML Boundary**: Communication with the FastAPI ML model is strictly encapsulated within [`backend/src/lib/ml-client.ts`](file:///Users/priyanshukashyap/Desktop/SIH%202026/backend/src/lib/ml-client.ts) via configurable `ML_SERVICE_URL`.
3. If the ML service is offline or unreachable, the backend API continues to operate independently and marks failed analysis attempts gracefully as `FAILED`.