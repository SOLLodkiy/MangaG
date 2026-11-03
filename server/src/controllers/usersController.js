import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import HttpError from '../utils/HttpError.js';
import { deleteUpload, saveImage } from '../utils/images.js';
import { signToken } from '../utils/jwt.js';
import { privateUser, publicUser } from '../utils/serializers.js';
import { SALT_ROUNDS } from './authController.js';

// GET /api/users/:username — публичный профиль
export async function getProfile(req, res) {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username },
    include: {
      titles: {
        select: { id: true, slug: true, name: true, coverUrl: true, type: true, status: true },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { comments: true, bookmarks: true, donationsReceived: true } },
    },
  });
  if (!user) throw HttpError.notFound('Пользователь не найден');

  res.json({
    user: publicUser(user),
    titles: user.titles,
    stats: {
      titles: user.titles.length,
      comments: user._count.comments,
      bookmarks: user._count.bookmarks,
      donationsReceived: user._count.donationsReceived,
    },
  });
}

// PATCH /api/users/me — имя пользователя, «о себе»
export async function updateMe(req, res) {
  const { username, bio } = req.body;

  if (username && username !== req.user.username) {
    const taken = await prisma.user.findUnique({ where: { username } });
    if (taken) throw HttpError.conflict('Это имя пользователя занято');
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { username, bio },
  });
  res.json({ user: privateUser(user) });
}

// PATCH /api/users/me/password
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!(await bcrypt.compare(currentPassword, req.user.passwordHash))) {
    throw HttpError.badRequest('Текущий пароль указан неверно');
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, SALT_ROUNDS) },
  });
  res.json({ message: 'Пароль изменён' });
}

// POST /api/users/me/avatar — multipart, поле "avatar"
export async function uploadAvatar(req, res) {
  if (!req.file) throw HttpError.badRequest('Файл не выбран');

  const image = await saveImage(req.file.buffer, 'avatars', {
    width: 256,
    height: 256,
    fit: 'cover',
  });
  await deleteUpload(req.user.avatarUrl);

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatarUrl: image.url },
  });
  res.json({ user: privateUser(user) });
}

// DELETE /api/users/me/avatar
export async function deleteAvatar(req, res) {
  await deleteUpload(req.user.avatarUrl);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatarUrl: null },
  });
  res.json({ user: privateUser(user) });
}

// POST /api/users/me/become-author — читатель получает роль автора
export async function becomeAuthor(req, res) {
  if (req.user.role !== 'READER') {
    throw HttpError.badRequest('У вас уже есть права автора');
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { role: 'AUTHOR' },
  });
  // Выдаём новый токен, т.к. в нём хранится роль
  res.json({ token: signToken(user), user: privateUser(user) });
}
