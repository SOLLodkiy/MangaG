// Транслитерация русских названий в адрес страницы:
// "Ван-Пис: Начало" -> "van-pis-nachalo"
const MAP = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export function slugify(text) {
  const slug = text
    .toLowerCase()
    .split('')
    .map((ch) => (ch in MAP ? MAP[ch] : ch))
    .join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // убираем диакритику (é -> e)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

  // slug не должен быть пустым или состоять только из цифр (чтобы не путать с id)
  if (!slug) return 'title';
  if (/^\d+$/.test(slug)) return `title-${slug}`;
  return slug;
}

// Подбирает свободный slug: name, name-2, name-3...
export async function uniqueSlug(prisma, name, excludeId) {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; ; i++) {
    const existing = await prisma.title.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
}
