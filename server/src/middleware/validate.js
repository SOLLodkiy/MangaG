// Проверка входных данных через zod.
// Пример: router.post('/', validate({ body: createTitleSchema }), controller.create)
// После проверки в req.body / req.query / req.params лежат уже очищенные данные.
import HttpError from '../utils/HttpError.js';

export default function validate(schemas) {
  return (req, _res, next) => {
    for (const key of ['params', 'query', 'body']) {
      if (!schemas[key]) continue;

      const result = schemas[key].safeParse(req[key] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return next(HttpError.badRequest('Ошибка валидации данных', details));
      }

      // в Express 5 req.query — геттер, поэтому переопределяем через defineProperty
      Object.defineProperty(req, key, { value: result.data, writable: true, configurable: true });
    }
    next();
  };
}
