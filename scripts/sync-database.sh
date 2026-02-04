#!/bin/bash

echo "🔄 Syncing database schema..."
echo ""

# Check if docker compose is running
echo "1. Checking PostgreSQL..."
docker compose ps postgres || {
  echo "❌ PostgreSQL not running"
  echo "   Run: docker compose up -d"
  exit 1
}

echo "✅ PostgreSQL is running"
echo ""

# Generate Prisma client
echo "2. Generating Prisma client..."
npm run db:generate || {
  echo "❌ Failed to generate Prisma client"
  exit 1
}

echo "✅ Prisma client generated"
echo ""

# Push schema to database
echo "3. Pushing schema to database..."
npx prisma db push --skip-generate || {
  echo "❌ Failed to push schema"
  exit 1
}

echo "✅ Schema pushed successfully"
echo ""

echo "🎉 Database sync complete!"
echo ""
echo "Tables created:"
echo "  - users"
echo "  - jobs"
echo "  - albums ← NEW"
echo "  - recipes ← NEW"
echo ""
echo "Next steps:"
echo "  npm run dev         # Start API"
echo "  npm run worker:dev  # Start Worker"
echo "  cd frontend && npm run dev  # Start Frontend"
