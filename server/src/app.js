// Express-приложение (без запуска сервера — удобно для тестов)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import config from './config.js';
import apiRouter from './routes/index.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(
  helmet({
    // картинки из /uploads должен показывать клиент с другого порта
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
if (config.env !== 'test') app.use(morgan('dev'));

// Загруженные изображения (обложки, страницы глав, аватары)
app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d' }));

app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
