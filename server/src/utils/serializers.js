// Превращение записей БД в объекты для ответа API.
// Главное — никогда не отдавать passwordHash.

// Данные о себе (GET /auth/me): с email и балансом
export function privateUser(user) {
  const { passwordHash: _hash, ...rest } = user;
  return rest;
}

// Данные о другом пользователе: без email и баланса
export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    role: user.role,
    createdAt: user.createdAt,
  };
}
