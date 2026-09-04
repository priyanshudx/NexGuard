# NexGuard Backend Service

Enterprise REST API backend for the NexGuard AI-Powered Network Anomaly Detection platform. Built with **Node.js, TypeScript, Express, Supabase (PostgreSQL, Auth, Storage)**, and integrates with the external **FastAPI ML service**.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Build TypeScript
npm run build

# 4. Start development server with live reload
npm run dev

# 5. Run tests
npm test
```

---

## Available NPM Scripts

- `npm run dev`: Runs the service in watch mode with `tsx`.
- `npm run build`: Compiles TypeScript from `src/` to `dist/`.
- `npm start`: Runs the compiled production server (`node dist/server.js`).
- `npm test`: Runs the automated integration test suite (18 test scenarios with mock ML boundary).
- `npm run test:integration`: Runs the smoke test against the live FastAPI ML service at `ML_SERVICE_URL`.
- `npm run test:all`: Executes both `npm test` and `npm run test:integration`.

---

## Documentation Links

- **API Specification**: [`docs/api.md`](docs/api.md)
- **Testing & Demo Reliability Guide**: [`docs/testing.md`](docs/testing.md)
- **Production Deployment Guide**: [`docs/deployment.md`](docs/deployment.md)
- **FastAPI ML Service Contract**: [`docs/ml-integration.md`](docs/ml-integration.md)
