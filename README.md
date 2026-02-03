# Content Factory

API-first platform for long-running AI content generation jobs with async workers and real-time tracking.

**Current Phase:** Phase 2 (Workers + Queue)

## 🏗️ Architecture

```
┌─────────────┐
│   CLIENT    │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐
│  Core API   │  ← Phase 1 + 2
│  (Express)  │
└──────┬──────┘
       │
   ┌───┴────┬─────────┐
   ▼        ▼         ▼
┌─────┐  ┌─────┐  ┌────────┐
│ PG  │  │Redis│  │ Redis  │
│ SQL │  │Queue│  │ Cache  │
└─────┘  └──┬──┘  └────────┘
            │
       ┌────┴────┬────────┐
       ▼         ▼        ▼
   ┌──────┐  ┌──────┐ ┌──────┐
   │Worker│  │Worker│ │Worker│  ← Phase 2 (NEW)
   │  1   │  │  2   │ │  3   │
   └──────┘  └──────┘ └──────┘
```

**Phases:**
- ✅ Phase 1: Core API + Job CRUD
- ✅ Phase 2: Workers + Queue (current)
- 🔜 Phase 3: Real-time WebSocket
- 🔜 Phase 4: Frontend
- 🔜 Phase 5: Auth, CI/CD, Monitoring

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20
- Docker & Docker Compose

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/f2x33k-oss/content-factory
   cd content-factory
   git checkout cursor/core-product-architecture-design-1e67
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys:
   # - GEMINI_API_KEY (Google AI Studio)
   # - SDXL_API_KEY (Stability AI)
   ```

4. **Start PostgreSQL + Redis**
   ```bash
   docker compose up -d
   ```

5. **Setup database**
   ```bash
   npm run db:generate
   npm run db:migrate
   
   # Create default user (hardcoded for MVP)
   docker exec -it content-factory-db psql -U postgres -d content_factory -c \
     "INSERT INTO users (id, email, name, \"createdAt\", \"updatedAt\") 
      VALUES (1, 'dev@example.com', 'Dev User', NOW(), NOW()) 
      ON CONFLICT (id) DO NOTHING;"
   ```

6. **Start API server**
   ```bash
   npm run dev
   ```

7. **Start Worker (separate terminal)**
   ```bash
   npm run worker:dev
   ```

API is now running on `http://localhost:3000`  
Worker is processing jobs from the queue

---

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

---

### Create Job (Text Generation)
```bash
POST /jobs
Content-Type: application/json

{
  "type": "content_generation",
  "input": {
    "prompt": "Write 5 creative recipe ideas for gratins",
    "items": 5
  }
}
```

**Response (201):**
```json
{
  "id": "clx1234567890",
  "userId": 1,
  "type": "content_generation",
  "status": "pending",
  "input": {
    "prompt": "Write 5 creative recipe ideas for gratins",
    "items": 5
  },
  "output": null,
  "error": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Create Job (Image Generation)
```bash
POST /jobs
Content-Type: application/json

{
  "type": "image_generation",
  "input": {
    "prompt": "A beautiful sunset over mountains",
    "width": 1024,
    "height": 1024
  }
}
```

---

### Get All Jobs
```bash
GET /jobs
```

**Response (200):**
```json
[
  {
    "id": "clx1234567890",
    "userId": 1,
    "type": "content_generation",
    "status": "completed",
    "input": { "prompt": "...", "items": 5 },
    "output": {
      "type": "text",
      "prompt": "...",
      "content": "Generated content here...",
      "model": "gemini-1.5-flash",
      "generatedAt": "2024-01-01T00:00:00.000Z"
    },
    "error": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:05.000Z"
  }
]
```

---

### Get Job by ID
```bash
GET /jobs/:id
```

**Response (200):**
```json
{
  "id": "clx1234567890",
  "userId": 1,
  "type": "content_generation",
  "status": "processing",
  "input": { "prompt": "...", "items": 5 },
  "output": null,
  "error": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:03.000Z"
}
```

**Status values:**
- `pending` - Job created, waiting in queue
- `processing` - Worker is executing the job
- `completed` - Job finished successfully
- `failed` - Job failed (see `error` field)

---

### Delete Job
```bash
DELETE /jobs/:id
```

**Response (204):** No content

---

## 🤖 Job Types

### 1. Text Generation (`content_generation` or `text_generation`)

Uses **Google Gemini AI** to generate text content.

**Input:**
```json
{
  "type": "content_generation",
  "input": {
    "prompt": "Your prompt here",
    "items": 1
  }
}
```

**Output:**
```json
{
  "type": "text",
  "prompt": "Your prompt here",
  "items": 1,
  "content": "Generated text content...",
  "model": "gemini-1.5-flash",
  "generatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 2. Image Generation (`image_generation`)

Uses **Stability AI SDXL** to generate images.

**Input:**
```json
{
  "type": "image_generation",
  "input": {
    "prompt": "A beautiful landscape",
    "negativePrompt": "blurry, low quality",
    "width": 1024,
    "height": 1024,
    "steps": 30
  }
}
```

**Output:**
```json
{
  "type": "image",
  "prompt": "A beautiful landscape",
  "imageUrl": "data:image/png;base64,...",
  "seed": 123456789,
  "generatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## 🧪 Testing with curl

### 1. Health check
```bash
curl http://localhost:3000/health
```

### 2. Create text generation job
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "content_generation",
    "input": {
      "prompt": "Write 3 interesting facts about gratins",
      "items": 3
    }
  }'
```

### 3. Create image generation job
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "image_generation",
    "input": {
      "prompt": "A futuristic city at night",
      "width": 1024,
      "height": 1024
    }
  }'
```

### 4. Poll job status
```bash
# Get the job ID from step 2 or 3
JOB_ID="clx1234567890"

# Poll until status changes to "completed" or "failed"
while true; do
  curl -s http://localhost:3000/jobs/$JOB_ID | jq '.status'
  sleep 2
done
```

### 5. Get job result
```bash
curl http://localhost:3000/jobs/$JOB_ID | jq
```

---

## 📁 Project Structure

```
content-factory/
├── src/
│   ├── config/
│   │   ├── database.ts      # Prisma client
│   │   ├── env.ts           # Environment config
│   │   └── queue.ts         # BullMQ queue setup (NEW)
│   ├── routes/
│   │   ├── health.ts        # Health check endpoint
│   │   └── jobs.ts          # Jobs CRUD + Queue push
│   ├── services/
│   │   ├── gemini.ts        # Gemini AI service (NEW)
│   │   └── sdxl.ts          # SDXL image service (NEW)
│   ├── server.ts            # Express app entry point
│   └── worker.ts            # Worker process (NEW)
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # DB migrations
├── docker-compose.yml       # PostgreSQL + Redis
├── package.json
├── tsconfig.json
├── .env                     # Local environment variables
├── .env.example             # Environment template
└── README.md
```

---

## 🗄️ Database Schema

### Users Table
```sql
users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  name        VARCHAR(255),
  createdAt   TIMESTAMP DEFAULT NOW(),
  updatedAt   TIMESTAMP DEFAULT NOW()
)
```

### Jobs Table
```sql
jobs (
  id          VARCHAR(255) PRIMARY KEY,  -- CUID
  userId      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(255) NOT NULL,
  status      VARCHAR(50) DEFAULT 'pending',
  input       JSONB NOT NULL,
  output      JSONB,
  error       TEXT,
  createdAt   TIMESTAMP DEFAULT NOW(),
  updatedAt   TIMESTAMP DEFAULT NOW()
)
```

**Indexes:**
- `userId` (for filtering by user)
- `status` (for filtering by status)
- `createdAt` (for sorting)

---

## 🛠️ Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API in watch mode |
| `npm start` | Start API in production mode |
| `npm run worker` | Start Worker (production) |
| `npm run worker:dev` | Start Worker in watch mode |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |

---

## 🔧 Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/content_factory?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=development

# MVP hardcoded user
DEFAULT_USER_ID=1

# AI APIs
GEMINI_API_KEY=your_gemini_api_key_here
SDXL_API_URL=https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image
SDXL_API_KEY=your_stability_api_key_here

# Worker
WORKER_CONCURRENCY=3
```

### Getting API Keys

**Gemini API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env` as `GEMINI_API_KEY`

**Stability AI API Key:**
1. Go to [DreamStudio](https://dreamstudio.ai/account)
2. Get your API key from the account page
3. Add to `.env` as `SDXL_API_KEY`

---

## ⚙️ Worker Configuration

**Concurrency:** 3 jobs in parallel (default)

**Retry Logic:**
- Max attempts: 3
- Backoff: Exponential (2s, 4s, 8s)

**Job Retention:**
- Completed jobs: Keep last 100, max 24 hours
- Failed jobs: Keep last 500, max 7 days

**Rate Limiting:**
- Max 10 jobs per minute

---

## 📊 Job Flow

```
1. User sends POST /jobs
   ↓
2. API creates job in PostgreSQL (status: "pending")
   ↓
3. API pushes job to Redis queue
   ↓
4. Worker picks up job from queue
   ↓
5. Worker updates job status to "processing"
   ↓
6. Worker executes job:
   - Text: Calls Gemini API
   - Image: Calls SDXL API
   ↓
7. Worker updates job:
   - Success: status="completed", output=result
   - Failure: status="failed", error=message
   ↓
8. User polls GET /jobs/:id to see result
```

---

## 🐛 Troubleshooting

### Worker not processing jobs

**Check Redis connection:**
```bash
docker exec -it content-factory-redis redis-cli ping
# Should return: PONG
```

**Check queue:**
```bash
docker exec -it content-factory-redis redis-cli
> KEYS *
> EXIT
```

**Check worker logs:**
```bash
# Worker should show:
# 🚀 Worker started
# 📊 Concurrency: 3 jobs
# ⏳ Waiting for jobs...
```

---

### Job fails with "API key not configured"

Make sure you've set the API keys in `.env`:
```bash
# Check current values
cat .env | grep API_KEY

# Edit .env
nano .env
# Add your real API keys

# Restart worker
# Ctrl+C to stop, then:
npm run worker:dev
```

---

### Port already in use

**Port 5432 (PostgreSQL):**
```bash
sudo service postgresql stop
# Or change port in docker-compose.yml
```

**Port 6379 (Redis):**
```bash
sudo service redis-server stop
# Or change port in docker-compose.yml
```

**Port 3000 (API):**
```bash
# Change PORT in .env
PORT=3001
```

---

### Database connection error

```bash
# Check PostgreSQL is running
docker compose ps

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Restart PostgreSQL
docker compose restart postgres
```

---

## ⚠️ Phase 2 Limitations

**What's NOT included in Phase 2:**
- ❌ Real-time WebSocket (Phase 3)
- ❌ Frontend UI (Phase 4)
- ❌ Real authentication (Phase 5)
- ❌ Tests / CI/CD (Phase 5)
- ❌ Monitoring / Observability (Phase 5)
- ❌ Advanced retry logic (using Bull defaults)

**Phase 2 includes:**
- ✅ Redis queue (BullMQ)
- ✅ Worker process (separate from API)
- ✅ Job execution (Gemini + SDXL)
- ✅ Status tracking via DB polling
- ✅ 3 concurrent jobs max
- ✅ Basic error handling

---

## 📝 Useful Commands

### Access PostgreSQL
```bash
docker exec -it content-factory-db psql -U postgres -d content_factory
```

### Access Redis CLI
```bash
docker exec -it content-factory-redis redis-cli
```

### View all jobs (SQL)
```sql
SELECT id, type, status, "createdAt" FROM jobs ORDER BY "createdAt" DESC LIMIT 10;
```

### View queue stats (Redis)
```bash
docker exec -it content-factory-redis redis-cli
> KEYS bull:content-factory-jobs:*
> GET bull:content-factory-jobs:wait
```

### Reset database
```bash
npm run db:migrate -- --reset
```

### Stop all services
```bash
docker compose down
```

### Stop and remove volumes
```bash
docker compose down -v
```

---

## 📊 Next Steps (Phase 3)

- [ ] Add WebSocket server to Core API
- [ ] Workers publish progress events to Redis Pub/Sub
- [ ] API broadcasts events to connected clients
- [ ] Real-time job progress tracking

---

## 📄 License

MIT

---

**Status:** ✅ Phase 2 Complete (Workers + Queue)  
**Last Updated:** 2026-02-03
