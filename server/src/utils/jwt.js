// Создание и проверка JWT-токенов
import jwt from 'jsonwebtoken';
import config from '../config.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

// Возвращает payload или null, если токен неверный/просрочен
export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}
