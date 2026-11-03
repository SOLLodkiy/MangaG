// Сохранение загруженных изображений: сжатие через sharp и конвертация в webp
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import config from '../config.js';
import HttpError from './HttpError.js';

/**
 * Сохраняет изображение в uploads/<folder>/ и возвращает его URL и размеры.
 * @param {Buffer} buffer   содержимое файла
 * @param {string} folder   подпапка: avatars, covers, pages/<chapterId>
 * @param {object} options  { width, height, fit, quality }
 */
export async function saveImage(buffer, folder, options = {}) {
  const { width, height, fit = 'inside', quality = 82 } = options;

  const dir = path.join(config.uploadsDir, folder);
  await fs.mkdir(dir, { recursive: true });

  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
  const filePath = path.join(dir, fileName);

  let info;
  try {
    info = await sharp(buffer)
      .rotate() // учитываем EXIF-ориентацию фото с телефона
      .resize({ width, height, fit, withoutEnlargement: true })
      .webp({ quality })
      .toFile(filePath);
  } catch {
    throw HttpError.badRequest('Файл повреждён или не является изображением');
  }

  return {
    url: `/uploads/${folder}/${fileName}`,
    width: info.width,
    height: info.height,
  };
}

// Удаляет ранее загруженный файл по его URL (/uploads/...). Ошибки игнорируем.
export async function deleteUpload(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const filePath = path.join(config.uploadsDir, url.replace('/uploads/', ''));
  // защита от выхода за пределы папки uploads
  if (!filePath.startsWith(config.uploadsDir)) return;
  await fs.rm(filePath, { force: true }).catch(() => {});
}

// Удаляет целую папку внутри uploads (например, страницы главы: pages/15)
export async function deleteUploadDir(folder) {
  const dirPath = path.join(config.uploadsDir, folder);
  if (!dirPath.startsWith(config.uploadsDir + path.sep)) return;
  await fs.rm(dirPath, { recursive: true, force: true }).catch(() => {});
}
