// Пересчёт денормализованных полей тайтла
import prisma from '../prisma.js';

export function buildSearchText(name, altName) {
  return [name, altName].filter(Boolean).join(' ').toLowerCase();
}

// Средняя оценка и количество оценок
export async function recalcRating(titleId) {
  const agg = await prisma.rating.aggregate({
    where: { titleId },
    _avg: { score: true },
    _count: true,
  });
  await prisma.title.update({
    where: { id: titleId },
    data: {
      ratingAvg: Math.round((agg._avg.score ?? 0) * 100) / 100,
      ratingCount: agg._count,
    },
  });
}

// Дата последней опубликованной главы
export async function recalcLastChapterAt(titleId) {
  const last = await prisma.chapter.findFirst({
    where: { titleId, isPublished: true },
    orderBy: { publishedAt: 'desc' },
    select: { publishedAt: true },
  });
  await prisma.title.update({
    where: { id: titleId },
    data: { lastChapterAt: last?.publishedAt ?? null },
  });
}
