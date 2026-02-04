-- CreateTable
CREATE TABLE "albums" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "imageApi" TEXT NOT NULL,
    "textEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "cost" DOUBLE PRECISION,
    "estimatedTime" INTEGER,
    "actualTime" INTEGER,
    "referenceImages" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "ingredients" JSONB,
    "steps" JSONB,
    "prepTime" TEXT,
    "cookTime" TEXT,
    "imageUrl" TEXT,
    "imagePrompt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "albums_userId_status_idx" ON "albums"("userId", "status");

-- CreateIndex
CREATE INDEX "albums_createdAt_idx" ON "albums"("createdAt");

-- CreateIndex
CREATE INDEX "recipes_albumId_order_idx" ON "recipes"("albumId", "order");

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
