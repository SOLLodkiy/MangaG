import { z } from 'zod';

export const idParam = z.object({
  id: z.coerce.number().int().positive('Некорректный id'),
});

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Имя пользователя — минимум 3 символа')
  .max(20, 'Имя пользователя — максимум 20 символов')
  .regex(/^[a-zA-Z0-9_]+$/, 'Только латинские буквы, цифры и _');

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Некорректный email'));

export const passwordSchema = z
  .string()
  .min(6, 'Пароль — минимум 6 символов')
  .max(72, 'Пароль — максимум 72 символа');
