import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import HttpError from '../utils/HttpError.js';
import { signToken } from '../utils/jwt.js';
import { privateUser } from '../utils/serializers.js';

const SALT_ROUNDS = 10;

// POST /api/auth/register
export async function register(req, res) {
  const { email, username, password } = req.body;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    throw HttpError.conflict(
      existing.email === email ? 'Этот email уже зарегистрирован' : 'Это имя пользователя занято',
    );
  }

  const user = await prisma.user.create({
    data: { email, username, passwordHash: await bcrypt.hash(password, SALT_ROUNDS) },
  });

  res.status(201).json({ token: signToken(user), user: privateUser(user) });
}

// POST /api/auth/login
export async function login(req, res) {
  const { login, password } = req.body;

  const user = await prisma.user.findFirst({
    where: login.includes('@') ? { email: login.toLowerCase() } : { username: login },
  });

  // Одинаковое сообщение, чтобы нельзя было узнать, существует ли аккаунт
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw HttpError.unauthorized('Неверный логин или пароль');
  }

  res.json({ token: signToken(user), user: privateUser(user) });
}

// GET /api/auth/me
export async function me(req, res) {
  res.json({ user: privateUser(req.user) });
}

export { SALT_ROUNDS };
