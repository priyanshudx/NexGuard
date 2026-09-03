# Architecture & Project Rules

## System Architecture

```
Frontend (TypeScript) ──> Backend (Node/TypeScript REST API) ──> ML Service (Python FastAPI)
                                    │
                                    ▼
                          Supabase (Auth/DB/Storage)
```

## Core Principles & Rules

1. **Language & Stack**:
   - TypeScript everywhere on the JS/Node side.
   - REST API for Backend communication.
   - Supabase for Auth, Database (PostgreSQL), and Object Storage.
   - ML is a separate Python service (FastAPI).

2. **Separation of Concerns**:
   - **No ML logic in Node**: Node handles application logic, user auth, and orchestration; heavy ML tasks belong strictly in the Python ML service.
   - **No database logic in controllers**: Keep HTTP controllers lean; delegate database queries to service/repository modules or Supabase client abstractions.

3. **Simplicity & Pragmatism**:
   - **No unnecessary abstractions**: Avoid premature generalizations, deep inheritance, or heavy design pattern boilerplate.
   - **No additional microservices**: Only two services exist—the main Node backend and the Python ML service.
   - **No infrastructure bloat**: No Redis, Kafka, or Kubernetes initially. Keep deployment and execution lightweight.
   - **No fake production data**: Rely on clean schema definitions and real user/test data.
   - **Just-in-Time file creation**: Do not create placeholder files or empty directories until they are needed.
   - **Keep API small**: Expose minimal, well-defined REST endpoints.
