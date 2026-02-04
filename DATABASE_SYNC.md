# Database Sync Instructions

## Problem
Album and Recipe tables need to be created in your local PostgreSQL database.

## Solution

Run these commands in order:

### 1. Start PostgreSQL + Redis
```bash
docker compose up -d
```

### 2. Verify services are running
```bash
docker compose ps
```

Both `content-factory-db` and `content-factory-redis` should be "Up".

### 3. Generate Prisma Client
```bash
npm run db:generate
```

### 4. Sync database schema
```bash
npx prisma db push
```

This will create the `albums` and `recipes` tables.

### 5. Verify tables (optional)
```bash
npm run db:studio
```

Open Prisma Studio and verify you see:
- users
- jobs
- albums ← NEW
- recipes ← NEW

### 6. Start services
```bash
# Terminal 1: API
npm run dev

# Terminal 2: Worker
npm run worker:dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

## Alternative: Reset database (CAUTION: deletes all data)

If you want a clean slate:

```bash
npx prisma migrate reset
```

This will:
- Drop all tables
- Re-run all migrations
- Create tables from scratch
