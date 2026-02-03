# Content Factory

API for async AI job processing.

## Setup

```bash
# Install
npm install

# Configure .env
cp .env.example .env
# Add GEMINI_API_KEY

# Start services
docker compose up -d

# Database
npm run db:generate
npm run db:migrate

# Create user
docker exec -it content-factory-db psql -U postgres -d content_factory -c \
  "INSERT INTO users (id, email) VALUES (1, 'dev@example.com') ON CONFLICT DO NOTHING;"

# Start API
npm run dev

# Start Worker (separate terminal)
npm run worker:dev

# Start Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Usage

Create job:
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"type": "content_generation", "input": {"prompt": "Hello"}}'
```

Get job:
```bash
curl http://localhost:3000/jobs/:id
```

## Environment

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/content_factory
REDIS_HOST=localhost
REDIS_PORT=6379
GEMINI_API_KEY=your_key
WORKER_CONCURRENCY=3
```

Get Gemini key: https://makersuite.google.com/app/apikey

## Scripts

- `npm run dev` - API
- `npm run worker:dev` - Worker
- `npm run db:migrate` - Migrations
- `cd frontend && npm run dev` - Frontend

## How it works

1. POST /jobs → Creates job in DB
2. Job pushed to Redis queue
3. Worker picks up job
4. Worker calls Gemini API
5. Worker updates job status
6. GET /jobs/:id → Returns result

## WebSocket

Connect:
```javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000');

socket.on('job.read', (data) => console.log(data));
socket.on('job.list', (data) => console.log(data));
```

Events: `job.read`, `job.list`

Payload: `{ jobId: "string", status: "pending|processing|completed|failed" }`

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
