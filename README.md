# Content Factory

API-first platform for long-running AI content generation jobs with async workers and real-time tracking.

**Current Phase:** Phase 1 MVP (Job Creation & Tracking)

## 🏗️ Architecture

```
┌─────────────┐
│  Core API   │  ← Phase 1 (current)
│  (Express)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ PostgreSQL  │
└─────────────┘
```

**Future Phases:**
- Phase 2: Workers + Redis Queue
- Phase 3: Real-time WebSocket
- Phase 4: Frontend
- Phase 5: Auth, CI/CD, Monitoring

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20
- Docker & Docker Compose

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd content-factory
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start PostgreSQL**
   ```bash
   docker-compose up -d
   ```

4. **Setup database**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. **Create default user** (hardcoded for MVP)
   ```bash
   # Access PostgreSQL
   docker exec -it content-factory-db psql -U postgres -d content_factory
   
   # Insert default user
   INSERT INTO users (id, email, name, "createdAt", "updatedAt") 
   VALUES (1, 'dev@example.com', 'Dev User', NOW(), NOW());
   
   # Exit
   \q
   ```

6. **Start API**
   ```bash
   npm run dev
   ```

API is now running on `http://localhost:3000`

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

### Create Job
```bash
POST /jobs
Content-Type: application/json

{
  "type": "content_generation",
  "input": {
    "title": "20 recipes about gratins",
    "items": 20
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
    "title": "20 recipes about gratins",
    "items": 20
  },
  "output": null,
  "error": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
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
    "status": "pending",
    "input": { "title": "...", "items": 20 },
    "output": null,
    "error": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
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
  "status": "pending",
  "input": { "title": "...", "items": 20 },
  "output": null,
  "error": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Update Job Status (Manual Testing)
```bash
PATCH /jobs/:id
Content-Type: application/json

{
  "status": "completed",
  "output": {
    "result": "Job completed successfully",
    "itemsGenerated": 20
  }
}
```

**Response (200):**
```json
{
  "id": "clx1234567890",
  "userId": 1,
  "type": "content_generation",
  "status": "completed",
  "input": { "title": "...", "items": 20 },
  "output": {
    "result": "Job completed successfully",
    "itemsGenerated": 20
  },
  "error": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Delete Job
```bash
DELETE /jobs/:id
```

**Response (204):** No content

---

## 🧪 Testing with curl

### 1. Health check
```bash
curl http://localhost:3000/health
```

### 2. Create a job
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "content_generation",
    "input": {
      "title": "20 recipes about gratins",
      "items": 20
    }
  }'
```

### 3. Get all jobs
```bash
curl http://localhost:3000/jobs
```

### 4. Get specific job (replace JOB_ID)
```bash
curl http://localhost:3000/jobs/JOB_ID
```

### 5. Update job status (replace JOB_ID)
```bash
curl -X PATCH http://localhost:3000/jobs/JOB_ID \
  -H "Content-Type: application/json" \
  -d '{
    "status": "processing"
  }'
```

### 6. Delete job (replace JOB_ID)
```bash
curl -X DELETE http://localhost:3000/jobs/JOB_ID
```

---

## 📁 Project Structure

```
content-factory/
├── src/
│   ├── config/
│   │   ├── database.ts      # Prisma client
│   │   └── env.ts           # Environment config
│   ├── routes/
│   │   ├── health.ts        # Health check endpoint
│   │   └── jobs.ts          # Jobs CRUD endpoints
│   └── server.ts            # Express app entry point
├── prisma/
│   └── schema.prisma        # Database schema
├── docker-compose.yml       # PostgreSQL container
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
| `npm run dev` | Start API in watch mode (auto-reload) |
| `npm start` | Start API in production mode |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |

---

## 🔧 Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/content_factory?schema=public"

# Server
PORT=3000
NODE_ENV=development

# MVP hardcoded user
DEFAULT_USER_ID=1
```

---

## ⚠️ Phase 1 Limitations

**What's NOT included in Phase 1:**
- ❌ Real authentication (hardcoded user)
- ❌ Job execution (workers in Phase 2)
- ❌ Real-time updates (WebSocket in Phase 3)
- ❌ Frontend UI (Phase 4)
- ❌ Tests / CI/CD (Phase 5)
- ❌ Rate limiting (Phase 5)
- ❌ Advanced validation (Phase 5)

**Phase 1 is ONLY:**
- ✅ Job creation (stored in DB)
- ✅ Job tracking (CRUD operations)
- ✅ PostgreSQL persistence
- ✅ Basic error handling

---

## 📝 Useful Commands

### Access PostgreSQL
```bash
docker exec -it content-factory-db psql -U postgres -d content_factory
```

### View all jobs
```sql
SELECT * FROM jobs ORDER BY "createdAt" DESC;
```

### Reset database
```bash
npm run db:migrate -- --reset
```

### Stop PostgreSQL
```bash
docker-compose down
```

### Stop and remove volumes
```bash
docker-compose down -v
```

---

## 🐛 Troubleshooting

### Port 5432 already in use
```bash
# Stop local PostgreSQL if running
sudo service postgresql stop

# Or change port in docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 instead
```

### Prisma client not generated
```bash
npm run db:generate
```

### Database connection error
```bash
# Check PostgreSQL is running
docker-compose ps

# Check DATABASE_URL in .env
cat .env
```

---

## 📊 Next Steps (Phase 2)

- [ ] Setup Redis for job queue
- [ ] Implement BullMQ for job processing
- [ ] Create Worker service (separate process)
- [ ] Add job execution logic
- [ ] Implement retry mechanism

---

## 📄 License

MIT

---

**Status:** ✅ Phase 1 MVP Complete  
**Last Updated:** 2026-02-03
