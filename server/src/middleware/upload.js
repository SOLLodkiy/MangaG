// Приём изображений через multer. Файлы хранятся в памяти,
// а на диск их записывает saveImage() уже после обработки sharp.
import multer from 'multer';
import config from '../config.js';
import HttpError from '../utils/HttpError.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadMb * 1024 * 1024,
    files: 200, // максимум страниц в одной загрузке
  },
  fileFilter(_req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(HttpError.badRequest('Разрешены только изображения JPG, PNG, WEBP, GIF'));
  },
});

// Переводим ошибки multer на русский
function wrap(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(HttpError.badRequest(`Файл больше ${config.maxUploadMb} МБ`));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(HttpError.badRequest('Слишком много файлов'));
        }
        return next(HttpError.badRequest(`Ошибка загрузки файла: ${err.message}`));
      }
      next(err);
    });
  };
}

export const uploadSingle = (field) => wrap(upload.single(field));
export const uploadMany = (field, max = 200) => wrap(upload.array(field, max));
