-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Title" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "altName" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'MANGA',
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "ageRating" INTEGER NOT NULL DEFAULT 0,
    "year" INTEGER,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "searchText" TEXT NOT NULL DEFAULT '',
    "ratingAvg" REAL NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "lastChapterAt" DATETIME,
    "authorId" INTEGER NOT NULL,
    CONSTRAINT "Title_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Title" ("ageRating", "altName", "authorId", "coverUrl", "createdAt", "description", "id", "name", "slug", "status", "type", "updatedAt", "views", "year") SELECT "ageRating", "altName", "authorId", "coverUrl", "createdAt", "description", "id", "name", "slug", "status", "type", "updatedAt", "views", "year" FROM "Title";
DROP TABLE "Title";
ALTER TABLE "new_Title" RENAME TO "Title";
CREATE UNIQUE INDEX "Title_slug_key" ON "Title"("slug");
CREATE INDEX "Title_authorId_idx" ON "Title"("authorId");
CREATE INDEX "Title_views_idx" ON "Title"("views");
CREATE INDEX "Title_ratingAvg_idx" ON "Title"("ratingAvg");
CREATE INDEX "Title_lastChapterAt_idx" ON "Title"("lastChapterAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
