import { z } from 'zod';
import { passwordSchema, usernameSchema } from './common.js';

export const usernameParam = z.object({
  username: z.string().trim().min(1),
});

export const updateProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    bio: z.string().trim().max(500, 'О себе — максимум 500 символов').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Нет данных для изменения');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: passwordSchema,
});
