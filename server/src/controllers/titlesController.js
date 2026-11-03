import prisma from '../prisma.js';
import HttpError from '../utils/HttpError.js';
import { isOwnerOrAdmin } from '../middleware/auth.js';
import { deleteUpload, deleteUploadDir, saveImage } from '../utils/images.js';
import { uniqueSlug } from '../utils/slugify.js';
import { buildSearchText } from '../services/titleService.js';

const authorSelect = { select: { id: true, username: true, avatarUrl: true } };
const genreSelect = { select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } };

const SORT_ORDER = {
  popular: [{ views: 'desc' }, { id: 'desc' }],
  rating: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }, { id: 'desc' }],
  new: [{ createdAt: 'desc' }, { id: 'desc' }],
  updated: [{ lastChapterAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
  name: [{ name: 'asc' }],
};

// Загружает тайтл и проверяет, что текущий пользователь может его менять
async function findEditableTitle(id, user) {
  const title = await prisma.title.findUnique({ where: { id } });
  if (!title) throw HttpError.notFound('Тайтл не найден');
  if (!isOwnerOrAdmin(user, title.authorId)) {
    throw HttpError.forbidden('Можно редактировать только свои тайтлы');
  }
  return title;
}

async function checkGenres(genreIds) {
  if (!genreIds?.length) return;
  const count = await prisma.genre.count({ where: { id: { in: genreIds } } });
  if (count !== new Set(genreIds).size) throw HttpError.badRequest('Указан несуществующий жанр');
}

// GET /api/genres
export async function listGenres(_req, res) {
  const genres = await prisma.genre.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { titles: true } } },
  });
  res.json({
    genres: genres.map((g) => ({ id: g.id, name: g.name, slug: g.slug, count: g._count.titles })),
  });
}

// GET /api/titles — каталог с фильтрами и пагинацией
export async function listTitles(req, res) {
  const { search, genres, types, statuses, author, sort, page, limit } = req.query;

  const where = {};
  if (search) where.searchText = { contains: search.toLowerCase() };
  if (types.length) where.type = { in: types };
  if (statuses.length) where.status = { in: statuses };
  if (author) where.authorId = author;
  if (genres.length) where.AND = genres.map((slug) => ({ genres: { some: { slug } } }));

  const [total, titles] = await Promise.all([
    prisma.title.count({ where }),
    prisma.title.findMany({
      where,
      orderBy: SORT_ORDER[sort],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        slug: true,
        name: true,
        coverUrl: true,
        type: true,
        status: true,
        year: true,
        views: true,
        ratingAvg: true,
        ratingCount: true,
        lastChapterAt: true,
        genres: genreSelect,
        _count: { select: { chapters: { where: { isPublished: true } } } },
      },
    }),
  ]);

  res.json({
    items: titles.map(({ _count, ...t }) => ({ ...t, chaptersCount: _count.chapters })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}

// GET /api/titles/:slug — карточка тайтла
export async function getTitle(req, res) {
  const title = await prisma.title.findUnique({
    where: { slug: req.params.slug },
    include: {
      author: authorSelect,
      genres: genreSelect,
      _count: { select: { chapters: { where: { isPublished: true } }, bookmarks: true } },
    },
  });
  if (!title) throw HttpError.notFound('Тайтл не найден');

  const { _count, searchText: _s, ...data } = title;
  const result = {
    ...data,
    chaptersCount: _count.chapters,
    bookmarksCount: _count.bookmarks,
    canEdit: isOwnerOrAdmin(req.user, title.authorId),
    // данные текущего пользователя (закладка, оценка, прогресс)
    my: null,
  };

  if (req.user) {
    const key = { userId_titleId: { userId: req.user.id, titleId: title.id } };
    const [bookmark, rating, progress] = await Promise.all([
      prisma.bookmark.findUnique({ where: key }),
      prisma.rating.findUnique({ where: key }),
      prisma.readProgress.findUnique({
        where: key,
        include: { chapter: { select: { id: true, volume: true, number: true } } },
      }),
    ]);
    result.my = {
      bookmark: bookmark?.list ?? null,
      rating: rating?.score ?? null,
      progress: progress
        ? {
            chapter: progress.chapter,
            pageOrder: progress.pageOrder,
            updatedAt: progress.updatedAt,
          }
        : null,
    };
  }

  res.json({ title: result });
}

// POST /api/titles — создать тайтл (автор или админ)
export async function createTitle(req, res) {
  const { genreIds = [], ...data } = req.body;
  await checkGenres(genreIds);

  const title = await prisma.title.create({
    data: {
      ...data,
      slug: await uniqueSlug(prisma, data.name),
      searchText: buildSearchText(data.name, data.altName),
      authorId: req.user.id,
      genres: { connect: genreIds.map((id) => ({ id })) },
    },
    include: { genres: genreSelect, author: authorSelect },
  });

  const { searchText: _s, ...result } = title;
  res.status(201).json({ title: result });
}

// PATCH /api/titles/:id
export async function updateTitle(req, res) {
  const title = await findEditableTitle(req.params.id, req.user);
  const { genreIds, ...data } = req.body;
  await checkGenres(genreIds);

  if (data.name && data.name !== title.name) {
    data.slug = await uniqueSlug(prisma, data.name, title.id);
  }
  if (data.name !== undefined || data.altName !== undefined) {
    data.searchText = buildSearchText(
      data.name ?? title.name,
      data.altName !== undefined ? data.altName : title.altName,
    );
  }
  if (genreIds) data.genres = { set: genreIds.map((id) => ({ id })) };

  const updated = await prisma.title.update({
    where: { id: title.id },
    data,
    include: { genres: genreSelect, author: authorSelect },
  });

  const { searchText: _s, ...result } = updated;
  res.json({ title: result });
}

// DELETE /api/titles/:id — вместе с главами, страницами и файлами
export async function deleteTitle(req, res) {
  const title = await findEditableTitle(req.params.id, req.user);
  const chapters = await prisma.chapter.findMany({
    where: { titleId: title.id },
    select: { id: true },
  });

  await prisma.title.delete({ where: { id: title.id } });

  await deleteUpload(title.coverUrl);
  await Promise.all(chapters.map((ch) => deleteUploadDir(`pages/${ch.id}`)));

  res.status(204).end();
}

// POST /api/titles/:id/cover — multipart, поле "cover"
export async function uploadCover(req, res) {
  const title = await findEditableTitle(req.params.id, req.user);
  if (!req.file) throw HttpError.badRequest('Файл не выбран');

  const image = await saveImage(req.file.buffer, 'covers', {
    width: 400,
    height: 600,
    fit: 'cover',
  });
  await deleteUpload(title.coverUrl);

  const updated = await prisma.title.update({
    where: { id: title.id },
    data: { coverUrl: image.url },
  });
  res.json({ coverUrl: updated.coverUrl });
}
