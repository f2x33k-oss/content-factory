# Content Factory

Production-ready API for async AI job processing with authentication.

## Setup

```bash
# Install
npm install

# Configure .env
cp .env.example .env
# Required: JWT_SECRET, GEMINI_API_KEY

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
GEMINI_API_KEY=your_gemini_key
NODE_ENV=development
WORKER_CONCURRENCY=3
```

## Production Mode

Set `NODE_ENV=production` and update:
- `JWT_SECRET` - Strong secret key
- CORS allowed origins in `src/server.ts`

Run:
```bash
npm start        # API
npm run worker   # Worker
```

## Security Features

- JWT authentication (7-day expiry)
- Bcrypt password hashing
- User ownership enforcement on all jobs
- Input validation (Zod)
- Rate limiting (100 req/15min per IP)
- CORS hardening (production mode)
- No secrets in repository

## API Endpoints

**Auth:**
- `POST /auth/register` - Create account
- `POST /auth/login` - Get JWT token

**Jobs (requires auth):**
- `POST /jobs` - Create job
- `GET /jobs` - List user's jobs
- `GET /jobs/:id` - Get job details
- `DELETE /jobs/:id` - Delete job

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
