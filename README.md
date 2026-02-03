# Content Factory

API-first platform for long-running AI content generation jobs.

**Current Phase:** Phase 2 (Workers + Queue)

## Quick Start

### Prerequisites

- Node.js >= 20
- Docker & Docker Compose

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Start PostgreSQL + Redis**
   ```bash
   docker compose up -d
   ```

4. **Setup database**
   ```bash
   npm run db:generate
   npm run db:migrate
   
   # Create default user
   docker exec -it content-factory-db psql -U postgres -d content_factory -c \
     "INSERT INTO users (id, email, name, \"createdAt\", \"updatedAt\") 
      VALUES (1, 'dev@example.com', 'Dev User', NOW(), NOW()) 
      ON CONFLICT (id) DO NOTHING;"
   ```

5. **Start API server**
   ```bash
   npm run dev
   ```

6. **Start Worker (separate terminal)**
   ```bash
   npm run worker:dev
   ```

API runs on `http://localhost:3000`

---

## API Endpoints

### Create Job
```bash
POST /jobs
Content-Type: application/json

{
  "type": "content_generation",
  "input": {
    "prompt": "Write 5 recipes about gratins"
  }
}
```

### Get Job Status
```bash
GET /jobs/:id
```

### List Jobs
```bash
GET /jobs
```

---

## Job Types

**Text generation:**
- `type`: `content_generation` or `text_generation`
- Uses Gemini API

**Image generation:**
- `type`: `image_generation`
- Uses SDXL API

---

## Configuration

Required environment variables:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/content_factory"
REDIS_HOST=localhost
REDIS_PORT=6379
GEMINI_API_KEY=your_key
SDXL_API_KEY=your_key
WORKER_CONCURRENCY=3
```

Get API keys:
- Gemini: https://makersuite.google.com/app/apikey
- SDXL: https://dreamstudio.ai/account

---

## Scripts

- `npm run dev` - Start API
- `npm run worker:dev` - Start Worker
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Prisma Studio

---

## Architecture

```
API → PostgreSQL (job storage)
API → Redis Queue → Worker → AI APIs
```

Job flow:
1. POST /jobs creates job in DB (status: pending)
2. Job pushed to Redis queue
3. Worker picks up job (status: processing)
4. Worker calls Gemini or SDXL
5. Worker updates job (status: completed/failed)
6. GET /jobs/:id returns result

---

## Troubleshooting

**Worker not processing:**
```bash
docker exec -it content-factory-redis redis-cli ping
```

**Database error:**
```bash
docker compose restart postgres
```

**Reset database:**
```bash
npm run db:migrate -- --reset
```

---

**License:** MIT
