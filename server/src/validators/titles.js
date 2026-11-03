import { z } from 'zod';

export const TITLE_TYPES = ['MANGA', 'MANHWA', 'MANHUA', 'COMIC'];
export const TITLE_STATUSES = ['ONGOING', 'COMPLETED', 'FROZEN'];
export const AGE_RATINGS = [0, 12, 16, 18];
export const SORTS = ['popular', 'rating', 'new', 'updated', 'name'];

const currentYear = new Date().getFullYear();

const titleFields = {
  name: z.string().trim().min(1, 'Введите название').max(200, 'Название слишком длинное'),
  altName: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(5000, 'Описание — максимум 5000 символов').optional(),
  type: z.enum(TITLE_TYPES, 'Неизвестный тип').optional(),
  status: z.enum(TITLE_STATUSES, 'Неизвестный статус').optional(),
  ageRating: z
    .number()
    .int()
    .refine((v) => AGE_RATINGS.includes(v), 'Возрастной рейтинг: 0, 12, 16 или 18')
    .optional(),
  year: z
    .number()
    .int()
    .min(1900)
    .max(currentYear + 1)
    .nullable()
    .optional(),
  genreIds: z.array(z.number().int().positive()).max(10, 'Не более 10 жанров').optional(),
};

export const createTitleSchema = z.object(titleFields);

export const updateTitleSchema = z
  .object(titleFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Нет данных для изменения');

export const slugParam = z.object({
  slug: z.string().trim().min(1),
});

// Параметры каталога: /titles?search=&genres=action,drama&type=MANGA&sort=rating&page=2
const csv = z
  .string()
  .optional()
  .transform((v) =>
    v
      ? v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  );

export const catalogQuery = z.object({
  search: z.string().trim().max(100).optional(),
  genres: csv, // slug-и жанров, тайтл должен содержать все
  types: csv.pipe(z.array(z.enum(TITLE_TYPES))),
  statuses: csv.pipe(z.array(z.enum(TITLE_STATUSES))),
  author: z.coerce.number().int().positive().optional(),
  sort: z.enum(SORTS).default('popular'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});
