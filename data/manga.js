/*
 * =====================================================================
 *  БИБЛИОТЕКА МАНГИ — этот файл редактируешь ты сам
 * =====================================================================
 *
 *  Каждая манга — объект в массиве ниже. Картинки лежат в папке
 *  manga/<slug>/ (slug — латинское имя папки, например "chainsaw-man"):
 *
 *    manga/
 *      chainsaw-man/
 *        cover.jpg          ← обложка (jpg, png или webp)
 *        ch-1/              ← глава 1
 *          1.jpg            ← страницы: 1.jpg, 2.jpg, 3.jpg ...
 *          2.jpg               (можно 001.jpg, 002.jpg или "page (1).jpg")
 *        ch-2/              ← глава 2
 *          ...
 *
 *  Главы и страницы сайт находит САМ: просто положи файлы в папки
 *  ch-1, ch-2, ch-3... Количество страниц указывать не нужно.
 *
 *  Если хочешь дать главам названия или указать дробные номера (10.5),
 *  перечисли главы в поле chapters (пример — в первой манге).
 *
 *  Подробная инструкция: manga/КАК_ДОБАВИТЬ_МАНГУ.md
 *  или страница «Как добавить мангу» на самом сайте.
 *
 *  Поля:
 *    slug        — имя папки в manga/ (только латиница, цифры и дефис)
 *    name        — название на русском
 *    altName     — оригинальное / английское название
 *    author      — автор манги (кому уходят донаты)
 *    type        — MANGA | MANHWA | MANHUA | COMIC
 *    status      — ONGOING (выходит) | COMPLETED (завершён) | FROZEN (заморожен)
 *    ageRating   — 0, 12, 16 или 18
 *    year        — год начала выпуска
 *    genres      — список slug жанров из data/genres.js
 *    description — описание
 *    cover       — имя файла обложки (по умолчанию ищется cover.jpg/png/webp)
 *    chapters    — (необязательно) список глав с названиями
 *    hidden      — true, чтобы временно скрыть мангу с сайта
 * =====================================================================
 */

window.MANGA_LIBRARY = [
  // ---------- Настоящий комикс со свободной лицензией (уже со страницами) ----------
  {
    slug: 'pepper-and-carrot',
    name: 'Перчинка и Морквик',
    altName: 'Pepper&Carrot',
    author: 'David Revoy',
    type: 'COMIC',
    status: 'ONGOING',
    ageRating: 0,
    year: 2014,
    genres: ['fantasy', 'comedy', 'adventure'],
    description:
      'Юная ведьма Перчинка и её рыжий кот Морквик живут в волшебном мире зелий, магии и ' +
      'забавных неприятностей. Настоящий веб-комикс французского художника Давида Ревуа, ' +
      'распространяется по свободной лицензии Creative Commons Attribution 4.0.\n\n' +
      'Автор: David Revoy (www.peppercarrot.com). Перевод на русский: ' +
      'Andrew «Akari» Alexeyew (эп. 1), Denis «uncle Night» Prisukhin (эп. 2–4). ' +
      'Лицензия: CC BY 4.0.',
    chapters: [
      { number: 1, name: 'Зелье полёта', date: '2014-05-10' },
      { number: 2, name: 'Радужные зелья', date: '2014-07-25' },
      { number: 3, name: 'Секретные ингредиенты', date: '2014-10-03' },
      { number: 4, name: 'Приступ гениальности', date: '2014-11-21' },
    ],
  },

  // ---------- Реальная манга: заполни папки картинками ----------
  {
    slug: 'jujutsu-kaisen',
    name: 'Магическая битва',
    altName: 'Jujutsu Kaisen',
    author: 'Гэгэ Акутами',
    type: 'MANGA',
    status: 'COMPLETED',
    ageRating: 16,
    year: 2018,
    genres: ['action', 'supernatural', 'school', 'drama'],
    description:
      'Старшеклассник Юдзи Итадори обладает невероятной физической силой, но живёт обычной жизнью. ' +
      'Всё меняется, когда он проглатывает палец Рёмэна Сукуны — могущественного проклятия — ' +
      'и оказывается втянут в мир магов, сражающихся с проклятиями.',
    // Пример: главы с названиями. Можно удалить этот список — тогда главы найдутся сами
    chapters: [
      { number: 1, name: 'Рёмэн Сукуна' },
      { number: 2, name: 'Ради себя' },
      { number: 3, name: 'Девушка из стали' },
    ],
  },
  {
    slug: 'chainsaw-man',
    name: 'Человек-бензопила',
    altName: 'Chainsaw Man',
    author: 'Тацуки Фудзимото',
    type: 'MANGA',
    status: 'ONGOING',
    ageRating: 18,
    year: 2018,
    genres: ['action', 'horror', 'supernatural', 'comedy'],
    description:
      'Дэндзи по уши в долгах и работает охотником на демонов вместе со своим псом-демоном Почитой. ' +
      'После предательства он сливается с Почитой и становится Человеком-бензопилой.',
  },
  {
    slug: 'solo-leveling',
    name: 'Поднятие уровня в одиночку',
    altName: 'Solo Leveling',
    author: 'Chugong, DUBU',
    type: 'MANHWA',
    status: 'COMPLETED',
    ageRating: 16,
    year: 2018,
    genres: ['action', 'fantasy', 'adventure'],
    description:
      'Сон Джин-У — самый слабый охотник E-ранга. Пережив смертельную ловушку в подземелье, ' +
      'он получает доступ к таинственной Системе, которая позволяет ему становиться сильнее.',
  },
  {
    slug: 'one-piece',
    name: 'Ван-Пис',
    altName: 'One Piece',
    author: 'Эйитиро Ода',
    type: 'MANGA',
    status: 'ONGOING',
    ageRating: 12,
    year: 1997,
    genres: ['action', 'adventure', 'comedy', 'fantasy'],
    description:
      'Монки Д. Луффи, съевший дьявольский плод и ставший резиновым, отправляется в море, ' +
      'чтобы найти легендарное сокровище Ван-Пис и стать Королём пиратов.',
  },
  {
    slug: 'attack-on-titan',
    name: 'Атака титанов',
    altName: 'Shingeki no Kyojin',
    author: 'Хадзимэ Исаяма',
    type: 'MANGA',
    status: 'COMPLETED',
    ageRating: 16,
    year: 2009,
    genres: ['action', 'drama', 'fantasy', 'mystery'],
    description:
      'Человечество живёт за огромными стенами, спасаясь от титанов — гигантов, пожирающих людей. ' +
      'Когда стена рушится, Эрен Йегер клянётся уничтожить всех титанов.',
  },
  {
    slug: 'demon-slayer',
    name: 'Клинок, рассекающий демонов',
    altName: 'Kimetsu no Yaiba',
    author: 'Коёхару Готогэ',
    type: 'MANGA',
    status: 'COMPLETED',
    ageRating: 16,
    year: 2016,
    genres: ['action', 'supernatural', 'historical', 'drama'],
    description:
      'Семью Танджиро Камадо убивает демон, а его сестра Нэдзуко сама превращается в демона. ' +
      'Танджиро становится истребителем демонов, чтобы вернуть сестре человеческий облик.',
  },

  // ---------- Демо-манга (нарисована программно, можно удалить) ----------
  {
    slug: 'demo-north-wind',
    name: 'Клинок Северного Ветра',
    altName: 'Blade of the North Wind',
    author: 'sakura_ink',
    type: 'MANGA',
    status: 'ONGOING',
    ageRating: 12,
    year: 2026,
    genres: ['action', 'fantasy', 'adventure'],
    description:
      'Демонстрационный тайтл. Юный кузнец Рэн находит в снегах сломанный меч, в котором живёт ' +
      'дух древнего ветра. Страницы нарисованы программно, чтобы показать работу читалки.',
    cover: 'cover.svg',
  },
  {
    slug: 'demo-neograd',
    name: 'Тень над Неоградом',
    altName: 'Shadow over Neograd',
    author: 'kuro_pen',
    type: 'COMIC',
    status: 'FROZEN',
    ageRating: 16,
    year: 2026,
    genres: ['mystery', 'sci-fi', 'psychological'],
    description:
      'Демонстрационный тайтл. В неоновом мегаполисе пропадают люди, а камеры видят только тень. ' +
      'Детектив Арсений Крылов берётся за дело, которое полиция давно закрыла.',
    cover: 'cover.svg',
  },
];
