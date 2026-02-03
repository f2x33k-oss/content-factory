# Content Factory

Production-ready API for async AI job processing with authentication.

## Setup

```bash
# Install
npm install

# Configure .env
cp .env.example .env
# Required: JWT_SECRET, OPENAI_API_KEY

# Start services
docker compose up -d

# Database
npm run db:generate
npm run db:migrate

# Start API
npm run dev

# Start Worker (separate terminal)
npm run worker:dev
```

## Authentication

All job endpoints require JWT authentication.

### Register
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123", "name": "User"}'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

Response includes JWT token.

### Authenticated Request
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"type": "content_generation", "input": {"prompt": "Hello"}}'
```

## Environment Variables

Required:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/content_factory
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_secret_key_change_in_production
OPENAI_API_KEY=your_openai_key
NODE_ENV=development
WORKER_CONCURRENCY=3
```

## Production Mode

Set `NODE_ENV=production` and update:
- `JWT_SECRET` - Strong secret key
- CORS allowed origins in `src/server.ts`

Run:
```bash
NODE_ENV=production npm start        # API
NODE_ENV=production npm run worker   # Worker
```

App fails fast on startup if required env vars are missing.

## Security Features

- JWT authentication (7-day expiry)
- Bcrypt password hashing
- User ownership enforcement on all jobs
- Input validation (Zod)
- Rate limiting (100 req/15min per IP)
- CORS hardening (production mode)
- No secrets in repository

## Health & Readiness

**No auth required:**
- `GET /health` - Returns 200 if app is alive
- `GET /ready` - Returns 200 if DB + Redis are reachable, 503 otherwise

Use `/health` for liveness probes.
Use `/ready` for readiness probes.

## API Endpoints

**Auth:**
- `POST /auth/register` - Create account
- `POST /auth/login` - Get JWT token

**Jobs (requires auth):**
- `POST /jobs` - Create job
- `GET /jobs` - List user's jobs
- `GET /jobs/:id` - Get job details
- `DELETE /jobs/:id` - Delete job

## Logs

All logs are structured JSON (Pino).

Example:
```json
{"level":"info","time":"2026-02-03T10:00:00.000Z","service":"api","msg":"API started","port":3000,"env":"production"}
```

Fields:
- `level`: info | warn | error
- `time`: ISO timestamp
- `service`: api | worker
- `msg`: Human-readable message
- Additional context fields

## Real-time Updates (WebSocket)

Workers publish job status changes to Redis Pub/Sub.
API listens to Redis and broadcasts via WebSocket.

### How it works

1. Worker updates job status in DB
2. Worker publishes event to Redis (channel: "job-events")
3. API receives event from Redis
4. API broadcasts to WebSocket clients subscribed to jobId

### Client usage

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// Subscribe to job updates
socket.emit('subscribe', { jobId: 'your-job-id' });

// Listen for events
socket.on('job.processing', (data) => {
  console.log('Job started:', data);
  // { jobId: "xxx", status: "job.processing" }
});

socket.on('job.completed', (data) => {
  console.log('Job completed:', data);
  // { jobId: "xxx", status: "job.completed" }
});

socket.on('job.failed', (data) => {
  console.log('Job failed:', data);
  // { jobId: "xxx", status: "job.failed" }
});

// Unsubscribe
socket.emit('unsubscribe', { jobId: 'your-job-id' });
```

**Events:**
- `job.processing` - Job started
- `job.completed` - Job finished successfully
- `job.failed` - Job failed

**Payload:**
```json
{
  "jobId": "clx123456",
  "status": "job.processing"
}
```

## Frontend

Minimal React UI to interact with API.

Start frontend:
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

Features:
- Create jobs (text/image)
- List jobs
- View job details (polls every 3s)
