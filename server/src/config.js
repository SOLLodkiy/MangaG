// Настройки приложения из переменных окружения (.env)
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 10,
  uploadsDir: path.resolve(__dirname, '..', 'uploads'),
};

if (config.env === 'production' && config.jwtSecret === 'dev-secret') {
  throw new Error('JWT_SECRET должен быть задан в production');
}

export default config;
