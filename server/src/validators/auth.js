import { z } from 'zod';
import { emailSchema, passwordSchema, usernameSchema } from './common.js';

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
});

// Входить можно по email или по имени пользователя
export const loginSchema = z.object({
  login: z.string().trim().min(1, 'Введите email или имя пользователя'),
  password: z.string().min(1, 'Введите пароль'),
});
