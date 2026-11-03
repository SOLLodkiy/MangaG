import HttpError from '../utils/HttpError.js';

export default function notFound(req, _res, next) {
  next(HttpError.notFound(`Маршрут ${req.method} ${req.originalUrl} не найден`));
}
