// Централизованный обработчик ошибок. Express 5 сам передаёт сюда
// ошибки из async-обработчиков, поэтому try/catch в контроллерах не нужен.
import { Prisma } from '@prisma/client';
import HttpError from '../utils/HttpError.js';
import config from '../config.js';

export default function errorHandler(err, _req, res, _next) {
  // Ошибки Prisma превращаем в понятные HTTP-ответы
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      err = HttpError.conflict('Запись с такими данными уже существует');
    } else if (err.code === 'P2025') {
      err = HttpError.notFound('Запись не найдена');
    }
  }

  // Слишком большое тело запроса / битый JSON
  if (err.type === 'entity.too.large') err = new HttpError(413, 'Слишком большой запрос');
  if (err.type === 'entity.parse.failed') err = HttpError.badRequest('Некорректный JSON');

  const status = err.status || 500;
  const body = { error: status === 500 ? 'Внутренняя ошибка сервера' : err.message };
  if (err.details) body.details = err.details;

  if (status === 500) {
    console.error(err);
    if (config.env !== 'production') body.stack = err.stack;
  }

  res.status(status).json(body);
}
