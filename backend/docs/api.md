# NexGuard REST API Documentation

Base URL: `/api/v1`

---

## Response & Error Conventions

### Success Response Format
```json
{
  "data": { ... }
}
```

### Paginated Collection Format
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42
  }
}
```

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

---

## 1. Health Endpoints

### `GET /api/v1/health`
- **Auth**: Public (No auth required)
- **Description**: Returns backend health and database connectivity status.
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "status": "ok",
      "uptime": 123.45,
      "timestamp": "2026-09-03T12:00:00.000Z",
      "database": {
        "configured": true,
        "connected": true
      }
    }
  }
  ```

### `GET /api/v1/health/ml`
- **Auth**: Protected (`Bearer <token>`)
- **Description**: Returns external FastAPI ML service reachability status.
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "mlService": {
        "reachable": true,
        "status": "ok",
        "url": "http://localhost:8000",
        "durationMs": 12
      }
    }
  }
  ```
- **Error Responses**:
  - `401 UNAUTHORIZED`: Missing or invalid Bearer token.

---

## 2. Authentication Endpoints

### `GET /api/v1/auth/me`
- **Auth**: Protected (`Bearer <token>`)
- **Description**: Returns the authenticated user's basic identity information.
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "role": "authenticated",
        "createdAt": "2026-09-03T10:00:00.000Z"
      }
    }
  }
  ```
- **Error Responses**:
  - `401 UNAUTHORIZED`: Missing or invalid Bearer token.

---

## 3. Dataset Endpoints

### `POST /api/v1/datasets`
- **Auth**: Protected (`Bearer <token>`)
- **Content-Type**: `multipart/form-data`
- **Body Form Data**: `file` (CSV file, max 50MB)
- **Description**: Uploads dataset CSV to private Supabase Storage and records metadata.
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "69958651-7c00-41dc-a1bc-e2f4b31fbe83",
      "filename": "network_traffic.csv",
      "size": 14500,
      "status": "uploaded",
      "createdAt": "2026-09-03T11:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 BAD_REQUEST`: Missing file, unsupported format (non-CSV), or file size limit exceeded.
  - `401 UNAUTHORIZED`: Missing or invalid Bearer token.

### `GET /api/v1/datasets`
- **Auth**: Protected (`Bearer <token>`)
- **Description**: Lists datasets belonging strictly to the authenticated user.
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "69958651-7c00-41dc-a1bc-e2f4b31fbe83",
        "filename": "network_traffic.csv",
        "size": 14500,
        "mimeType": "text/csv",
        "createdAt": "2026-09-03T11:00:00.000Z"
      }
    ]
  }
  ```

### `GET /api/v1/datasets/:id`
- **Auth**: Protected (`Bearer <token>`)
- **Description**: Retrieves single dataset metadata by ID for the authenticated user.
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "69958651-7c00-41dc-a1bc-e2f4b31fbe83",
      "filename": "network_traffic.csv",
      "size": 14500,
      "mimeType": "text/csv",
      "createdAt": "2026-09-03T11:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `404 NOT_FOUND`: Dataset does not exist or belongs to another user.

---

## 4. Analysis Endpoints

### `POST /api/v1/analyses`
- **Auth**: Protected (`Bearer <token>`)
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "dataset_id": "69958651-7c00-41dc-a1bc-e2f4b31fbe83",
    "horizon": 5
  }
  ```
- **Description**: Creates a new analysis job in `PENDING` status.
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "816b341c-c36e-408c-a8d9-476afd9b9645",
      "datasetId": "69958651-7c00-41dc-a1bc-e2f4b31fbe83",
      "status": "PENDING",
      "horizon": 5,
      "createdAt": "2026-09-03T11:30:00.000Z",
      "updatedAt": "2026-09-03T11:30:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 VALIDATION_ERROR`: Invalid body format or invalid horizon (<= 0).
  - `404 NOT_FOUND`: Dataset does not exist or belongs to another user.

### `GET /api/v1/analyses`
- **Auth**: Protected (`Bearer <token>`)
- **Query Params**: `page` (default 1), `limit` (default 10)
- **Description**: Lists paginated analyses belonging strictly to the authenticated user.
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "816b341c-c36e-408c-a8d9-476afd9b9645",
        "datasetId": "69958651-7c00-41dc-a1bc-e2f4b31fbe83",
        "status": "COMPLETED",
        "horizon": 5,
        "createdAt": "2026-09-03T11:30:00.000Z",
        "updatedAt": "2026-09-03T11:30:05.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1
    }
  }
  ```

### `GET /api/v1/analyses/:id`
- **Auth**: Protected (`Bearer <token>`)
- **Description**: Retrieves single analysis status and metadata by ID.
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "816b341c-c36e-408c-a8d9-476afd9b9645",
      "datasetId": "69958651-7c00-41dc-a1bc-e2f4b31fbe83",
      "status": "COMPLETED",
      "horizon": 5,
      "createdAt": "2026-09-03T11:30:00.000Z",
      "updatedAt": "2026-09-03T11:30:05.000Z"
    }
  }
  ```
- **Error Responses**:
  - `404 NOT_FOUND`: Analysis does not exist or belongs to another user.

### `POST /api/v1/analyses/:id/run`
- **Auth**: Protected (`Bearer <token>`)
- **Description**: Atomically transitions analysis status to `PROCESSING` and triggers non-blocking background ML prediction.
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "816b341c-c36e-408c-a8d9-476afd9b9645",
      "datasetId": "69958651-7c00-41dc-a1bc-e2f4b31fbe83",
      "status": "PROCESSING",
      "horizon": 5,
      "createdAt": "2026-09-03T11:30:00.000Z",
      "updatedAt": "2026-09-03T11:30:02.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 BAD_REQUEST`: Analysis is not in `PENDING` state.
  - `409 CONFLICT`: Duplicate run request (analysis already processing).
  - `404 NOT_FOUND`: Analysis does not exist or belongs to another user.

---

## 5. Result Endpoints

### `GET /api/v1/analyses/:id/forecast`
- **Auth**: Protected (`Bearer <token>`)
- **Description**: Retrieves time-series forecast step results for a completed analysis.
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "analysisId": "816b341c-c36e-408c-a8d9-476afd9b9645",
      "forecast": [
        {
          "stepNumber": 1,
          "timestamp": "2026-09-03T12:00:00.000Z",
          "forecastValue": 450.2,
          "lowerBound": 400.0,
          "upperBound": 500.0
        }
      ]
    }
  }
  ```
- **Error Responses**:
  - `404 NOT_FOUND`: Analysis does not exist or belongs to another user.

### `GET /api/v1/analyses/:id/explanation`
- **Auth**: Protected (`Bearer <token>`)
- **Description**: Retrieves anomaly explanation summary and feature insights for an analysis.
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "analysisId": "816b341c-c36e-408c-a8d9-476afd9b9645",
      "explanation": {
        "summary": "Predicted Stage: HIGH_ANOMALY",
        "insights": [
          "High packet burst detected at step 1"
        ],
        "featureImportance": {}
      }
    }
  }
  ```
- **Error Responses**:
  - `404 NOT_FOUND`: Analysis does not exist or belongs to another user.
