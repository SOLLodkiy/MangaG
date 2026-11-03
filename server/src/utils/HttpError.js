// Ошибка с HTTP-статусом. Бросаем её в контроллерах:
//   throw new HttpError(404, 'Тайтл не найден');
export default class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(message = 'Некорректный запрос', details) {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = 'Требуется авторизация') {
    return new HttpError(401, message);
  }

  static forbidden(message = 'Недостаточно прав') {
    return new HttpError(403, message);
  }

  static notFound(message = 'Не найдено') {
    return new HttpError(404, message);
  }

  static conflict(message = 'Конфликт данных') {
    return new HttpError(409, message);
  }
}
