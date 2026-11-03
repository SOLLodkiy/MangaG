// Перед тестами пересоздаём тестовую базу по миграциям
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default function globalSetup() {
  const dbFile = path.join(root, 'prisma', 'test.db');
  fs.rmSync(dbFile, { force: true });
  execSync('npx prisma migrate deploy', {
    cwd: root,
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  });
}
