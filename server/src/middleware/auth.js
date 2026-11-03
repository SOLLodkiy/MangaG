// Авторизация по заголовку "Authorization: Bearer <token>"
import prisma from '../prisma.js';
import HttpError from '../utils/HttpError.js';
import { verifyToken } from '../utils/jwt.js';

async function getUserFromRequest(req) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // Берём пользователя из БД, чтобы роль была актуальной
  // (например, если админ поменял её после выдачи токена)
  return prisma.user.findUnique({ where: { id: Number(payload.sub) } });
}

// Пускает только авторизованных. Пользователь кладётся в req.user
export async function requireAuth(req, _res, next) {
  const user = await getUserFromRequest(req);
  if (!user) throw HttpError.unauthorized();
  req.user = user;
  next();
}

// Пускает всех, но если токен есть — заполняет req.user
export async function optionalAuth(req, _res, next) {
  req.user = await getUserFromRequest(req);
  next();
}

// Проверка роли. Использовать после requireAuth:
//   router.post('/', requireAuth, requireRole('AUTHOR', 'ADMIN'), ...)
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(HttpError.unauthorized());
    if (!roles.includes(req.user.role)) return next(HttpError.forbidden());
    next();
  };
}

// Владелец ресурса или админ
export function isOwnerOrAdmin(user, ownerId) {
  return Boolean(user) && (user.role === 'ADMIN' || user.id === ownerId);
}
