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

## How it works

1. POST /jobs → Creates job in DB
2. Job pushed to Redis queue
3. Worker picks up job
4. Worker calls Gemini API
5. Worker updates job status
6. GET /jobs/:id → Returns result

## WebSocket (Real-time updates)

Connect to WebSocket:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// Subscribe to job updates
socket.emit('subscribe', { jobId: 'your-job-id' });

// Listen for events
socket.on('job.processing', (data) => {
  console.log('Job started:', data);
});

socket.on('job.completed', (data) => {
  console.log('Job completed:', data);
});

socket.on('job.failed', (data) => {
  console.log('Job failed:', data);
});
```

Event payload:
```json
{
  "jobId": "clx123456",
  "status": "job.processing"
}
```

Events:
- `job.processing` - Job started
- `job.completed` - Job finished
- `job.failed` - Job failed
