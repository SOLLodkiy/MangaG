// Библиотека тайтлов.
// Тайтлы берутся из двух источников:
//   1) 'file'  — из data/manga.js, картинки лежат в папке manga/<slug>/
//   2) 'local' — созданные через «Кабинет автора», картинки в IndexedDB
// Наружу оба вида отдаются в одном формате (см. normalizeFile / normalizeLocal).
const Library = {
  TYPES: { MANGA: 'Манга', MANHWA: 'Манхва', MANHUA: 'Маньхуа', COMIC: 'Комикс' },
  STATUSES: { ONGOING: 'Выходит', COMPLETED: 'Завершён', FROZEN: 'Заморожен' },
  LISTS: {
    READING: 'Читаю',
    PLANNED: 'В планах',
    COMPLETED: 'Прочитано',
    DROPPED: 'Брошено',
    FAVORITE: 'Любимое',
  },
  AGE_RATINGS: [0, 12, 16, 18],
  MANGA_DIR: 'manga',

  // Как могут называться файлы страниц: 1.jpg, 001.jpg, 01.jpg, "page (1).jpg"
  PAGE_NAMES: [
    (n) => String(n),
    (n) => String(n).padStart(3, '0'),
    (n) => String(n).padStart(2, '0'),
    (n) => `page (${n})`,
  ],
  IMAGE_EXTS: ['jpg', 'png', 'webp', 'jpeg', 'gif', 'svg'],

  _chaptersCache: new Map(),
  _pagesCache: new Map(),

  // ---------- Список тайтлов ----------

  genreName(slug) {
    const genre = (window.GENRES || []).find((g) => g.slug === slug);
    return genre ? genre.name : slug;
  },

  normalizeFile(raw) {
    const authorUser = raw.author ? Auth.byUsername(raw.author) : null;
    return {
      source: 'file',
      slug: raw.slug,
      name: raw.name,
      altName: raw.altName || '',
      author: raw.author || 'Неизвестен',
      authorUserId: authorUser ? authorUser.id : null,
      ownerId: null,
      type: raw.type || 'MANGA',
      status: raw.status || 'ONGOING',
      ageRating: raw.ageRating || 0,
      year: raw.year || null,
      genres: raw.genres || [],
      description: raw.description || '',
      cover: raw.cover || null,
      coverKey: null,
      createdAt: raw.year ? `${raw.year}-01-01` : '2000-01-01',
      hidden: Boolean(raw.hidden),
      raw,
    };
  },

  normalizeLocal(raw) {
    const owner = Auth.byId(raw.ownerId);
    return {
      source: 'local',
      slug: raw.slug,
      name: raw.name,
      altName: raw.altName || '',
      author: owner ? owner.username : 'Удалённый пользователь',
      authorUserId: raw.ownerId,
      ownerId: raw.ownerId,
      type: raw.type,
      status: raw.status,
      ageRating: raw.ageRating || 0,
      year: raw.year || null,
      genres: raw.genres || [],
      description: raw.description || '',
      cover: null,
      coverKey: raw.coverKey || null,
      createdAt: raw.createdAt,
      hidden: false,
      raw,
    };
  },

  // Все тайтлы, включая скрытые (для админки)
  allWithHidden() {
    const hidden = Store.get('hidden', []);
    const fromFiles = (window.MANGA_LIBRARY || [])
      .filter((raw) => raw && raw.slug && raw.name)
      .map((raw) => {
        const title = this.normalizeFile(raw);
        if (hidden.includes(title.slug)) title.hidden = true;
        return title;
      });
    const local = Store.get('titles', []).map((raw) => this.normalizeLocal(raw));
    return [...fromFiles, ...local];
  },

  all() {
    return this.allWithHidden().filter((t) => !t.hidden);
  },

  get(slug) {
    return this.all().find((t) => t.slug === slug) || null;
  },

  canEdit(title, user = Auth.current()) {
    if (!user || !title) return false;
    if (user.role === 'ADMIN') return true;
    return title.source === 'local' && title.ownerId === user.id;
  },

  // ---------- Обложки ----------

  // Варианты адреса обложки (первый найденный будет показан)
  coverUrls(title) {
    if (title.source !== 'file') return [];
    const base = `${this.MANGA_DIR}/${title.slug}/`;
    if (title.cover) return [base + title.cover];
    return ['jpg', 'png', 'webp', 'jpeg'].map((ext) => `${base}cover.${ext}`);
  },

  // ---------- Поиск файлов страниц ----------

  // Проверка, существует ли картинка (работает и при открытии через file://)
  probe(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  },

  // Находим, как названа первая страница в папке главы
  async detectPattern(folder) {
    const candidates = [];
    this.PAGE_NAMES.forEach((name, nameIndex) => {
      this.IMAGE_EXTS.forEach((ext) => candidates.push({ nameIndex, ext }));
    });
    const results = await Promise.all(
      candidates.map((c) => this.probe(`${folder}/${this.PAGE_NAMES[c.nameIndex](1)}.${c.ext}`)),
    );
    const found = candidates.find((_, i) => results[i]);
    return found || null;
  },

  pageUrl(folder, pattern, n) {
    return `${folder}/${this.PAGE_NAMES[pattern.nameIndex](n)}.${pattern.ext}`;
  },

  // Главы тайтла: [{ number, volume, name, date, published, folder | id }]
  async getChapters(title) {
    if (title.source === 'local') {
      return [...title.raw.chapters]
        .map((ch) => ({
          id: ch.id,
          number: ch.number,
          volume: ch.volume || 1,
          name: ch.name || '',
          date: ch.publishedAt,
          published: ch.published,
          pagesCount: ch.pages.length,
        }))
        .sort((a, b) => a.number - b.number);
    }

    if (this._chaptersCache.has(title.slug)) return this._chaptersCache.get(title.slug);

    const base = `${this.MANGA_DIR}/${title.slug}`;
    let chapters;

    if (Array.isArray(title.raw.chapters) && title.raw.chapters.length) {
      // главы перечислены в data/manga.js
      chapters = title.raw.chapters.map((ch) => ({
        number: Number(ch.number),
        volume: ch.volume || 1,
        name: ch.name || '',
        date: ch.date || null,
        published: true,
        folder: `${base}/${ch.folder || `ch-${ch.number}`}`,
        pagesCount: ch.pages || null,
      }));
    } else {
      // ищем папки ch-1, ch-2, ... пока они есть
      chapters = [];
      for (let n = 1; n <= 2000; n++) {
        const folder = `${base}/ch-${n}`;
        if (!(await this.detectPattern(folder))) break;
        chapters.push({ number: n, volume: 1, name: '', date: null, published: true, folder });
      }
    }

    chapters.sort((a, b) => a.number - b.number);
    this._chaptersCache.set(title.slug, chapters);
    return chapters;
  },

  // Страницы главы: [{ src }] или [{ key }] для картинок из IndexedDB
  async getPages(title, chapter) {
    if (title.source === 'local') {
      const raw = title.raw.chapters.find((c) => c.id === chapter.id);
      return raw ? raw.pages.map((key) => ({ key })) : [];
    }

    if (this._pagesCache.has(chapter.folder)) return this._pagesCache.get(chapter.folder);

    const pattern = await this.detectPattern(chapter.folder);
    const pages = [];
    if (pattern) {
      if (chapter.pagesCount) {
        for (let n = 1; n <= chapter.pagesCount; n++) {
          pages.push({ src: this.pageUrl(chapter.folder, pattern, n) });
        }
      } else {
        // проверяем страницы пачками по 8, пока не встретим отсутствующую
        let n = 1;
        let done = false;
        while (!done && n <= 1000) {
          const batch = Array.from({ length: 8 }, (_, i) => n + i);
          const exists = await Promise.all(
            batch.map((num) => this.probe(this.pageUrl(chapter.folder, pattern, num))),
          );
          for (let i = 0; i < batch.length; i++) {
            if (!exists[i]) {
              done = true;
              break;
            }
            pages.push({ src: this.pageUrl(chapter.folder, pattern, batch[i]) });
          }
          n += batch.length;
        }
      }
    }

    this._pagesCache.set(chapter.folder, pages);
    return pages;
  },

  // Сколько глав видно текущему пользователю
  visibleChapters(title, chapters) {
    return this.canEdit(title) ? chapters : chapters.filter((c) => c.published);
  },

  lastUpdate(title) {
    if (title.source === 'local') {
      const dates = title.raw.chapters.filter((c) => c.published).map((c) => c.publishedAt);
      return dates.sort().pop() || null;
    }
    const dates = (title.raw.chapters || []).map((c) => c.date).filter(Boolean);
    return dates.sort().pop() || null;
  },

  // ---------- Просмотры, оценки, закладки, прогресс, лайки ----------

  views(slug, chapterNumber) {
    const views = Store.get('views', {});
    return views[chapterNumber === undefined ? slug : `${slug}#${chapterNumber}`] || 0;
  },

  addView(slug, chapterNumber) {
    Store.update('views', {}, (views) => {
      views[slug] = (views[slug] || 0) + 1;
      const key = `${slug}#${chapterNumber}`;
      views[key] = (views[key] || 0) + 1;
    });
  },

  rating(slug) {
    const scores = Object.values(Store.get('ratings', {})[slug] || {});
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { avg: Math.round(avg * 10) / 10, count: scores.length };
  },

  myRating(slug, userId) {
    return (Store.get('ratings', {})[slug] || {})[userId] || null;
  },

  setRating(slug, userId, score) {
    Store.update('ratings', {}, (ratings) => {
      ratings[slug] = ratings[slug] || {};
      if (score) ratings[slug][userId] = score;
      else delete ratings[slug][userId];
    });
  },

  bookmark(userId, slug) {
    return (Store.get('bookmarks', {})[userId] || {})[slug] || null;
  },

  setBookmark(userId, slug, list) {
    Store.update('bookmarks', {}, (all) => {
      all[userId] = all[userId] || {};
      if (list) all[userId][slug] = list;
      else delete all[userId][slug];
    });
  },

  bookmarksOf(userId) {
    return Store.get('bookmarks', {})[userId] || {};
  },

  bookmarksCount(slug) {
    return Object.values(Store.get('bookmarks', {})).filter((b) => b[slug]).length;
  },

  // Прогресс чтения. Для гостей сохраняется под ключом 'guest'
  progress(slug, userId = Auth.current()?.id || 'guest') {
    return (Store.get('progress', {})[userId] || {})[slug] || null;
  },

  saveProgress(slug, chapter, page, userId = Auth.current()?.id || 'guest') {
    Store.update('progress', {}, (all) => {
      all[userId] = all[userId] || {};
      all[userId][slug] = { chapter, page, updatedAt: new Date().toISOString() };
    });
  },

  likes(slug, chapterNumber) {
    return Store.get('likes', {})[`${slug}#${chapterNumber}`] || [];
  },

  toggleLike(slug, chapterNumber, userId) {
    const key = `${slug}#${chapterNumber}`;
    let liked = false;
    Store.update('likes', {}, (likes) => {
      const list = likes[key] || [];
      liked = !list.includes(userId);
      likes[key] = liked ? [...list, userId] : list.filter((id) => id !== userId);
    });
    return liked;
  },

  // ---------- Тайтлы из «Кабинета автора» ----------

  _saveLocal(change) {
    Store.update('titles', [], change);
  },

  _localRaw(slug) {
    return Store.get('titles', []).find((t) => t.slug === slug) || null;
  },

  uniqueSlug(name) {
    const base = this.slugify(name);
    const taken = new Set(this.allWithHidden().map((t) => t.slug));
    let slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
    return slug;
  },

  slugify(name) {
    return Utils.slugify(name);
  },

  validateTitle(data) {
    if (!data.name || !data.name.trim()) throw new Error('Введите название');
    if (data.name.length > 200) throw new Error('Название слишком длинное');
    if (data.description && data.description.length > 5000) {
      throw new Error('Описание — максимум 5000 символов');
    }
    if (data.year && (data.year < 1900 || data.year > new Date().getFullYear() + 1)) {
      throw new Error('Некорректный год');
    }
  },

  createLocal(data, ownerId) {
    this.validateTitle(data);
    const now = new Date().toISOString();
    const raw = {
      slug: this.uniqueSlug(data.name),
      name: data.name.trim(),
      altName: (data.altName || '').trim(),
      description: (data.description || '').trim(),
      type: data.type || 'MANGA',
      status: data.status || 'ONGOING',
      ageRating: Number(data.ageRating) || 0,
      year: data.year ? Number(data.year) : null,
      genres: data.genres || [],
      coverKey: null,
      ownerId,
      createdAt: now,
      updatedAt: now,
      chapters: [],
    };
    this._saveLocal((titles) => {
      titles.push(raw);
    });
    return raw;
  },

  updateLocal(slug, changes) {
    if (changes.name !== undefined) this.validateTitle({ ...this._localRaw(slug), ...changes });
    this._saveLocal((titles) => {
      const t = titles.find((x) => x.slug === slug);
      if (t) Object.assign(t, changes, { updatedAt: new Date().toISOString() });
    });
  },

  async setLocalCover(slug, file) {
    const blob = await Utils.resizeImage(file, 400, 600);
    const key = await ImagesDB.put(blob);
    const old = this._localRaw(slug).coverKey;
    this.updateLocal(slug, { coverKey: key });
    await ImagesDB.remove(old);
  },

  async deleteLocal(slug) {
    const raw = this._localRaw(slug);
    if (!raw) return;
    const keys = [raw.coverKey, ...raw.chapters.flatMap((c) => c.pages)].filter(Boolean);
    this._saveLocal((titles) => titles.filter((t) => t.slug !== slug));
    await ImagesDB.removeMany(keys);
  },

  addChapter(slug, { number, volume, name }) {
    number = Number(number);
    if (!(number > 0)) throw new Error('Номер главы должен быть больше 0');
    const raw = this._localRaw(slug);
    if (raw.chapters.some((c) => c.number === number)) {
      throw new Error(`Глава ${number} уже существует`);
    }
    const chapter = {
      id: Utils.uid(),
      number,
      volume: Number(volume) || 1,
      name: (name || '').trim(),
      published: false,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      pages: [],
    };
    this._saveLocal((titles) => {
      titles.find((t) => t.slug === slug).chapters.push(chapter);
    });
    return chapter;
  },

  _changeChapter(slug, chapterId, change) {
    this._saveLocal((titles) => {
      const title = titles.find((t) => t.slug === slug);
      const chapter = title.chapters.find((c) => c.id === chapterId);
      change(chapter, title);
      title.updatedAt = new Date().toISOString();
    });
  },

  updateChapter(slug, chapterId, changes) {
    if (changes.number !== undefined) {
      const raw = this._localRaw(slug);
      if (raw.chapters.some((c) => c.id !== chapterId && c.number === Number(changes.number))) {
        throw new Error(`Глава ${changes.number} уже существует`);
      }
    }
    this._changeChapter(slug, chapterId, (chapter) => Object.assign(chapter, changes));
  },

  setPublished(slug, chapterId, published) {
    const raw = this._localRaw(slug);
    const chapter = raw.chapters.find((c) => c.id === chapterId);
    if (published && !chapter.pages.length) {
      throw new Error('Нельзя опубликовать главу без страниц');
    }
    this._changeChapter(slug, chapterId, (ch) => {
      ch.published = published;
      ch.publishedAt = published ? ch.publishedAt || new Date().toISOString() : null;
    });
  },

  async deleteChapter(slug, chapterId) {
    const chapter = this._localRaw(slug).chapters.find((c) => c.id === chapterId);
    this._saveLocal((titles) => {
      const title = titles.find((t) => t.slug === slug);
      title.chapters = title.chapters.filter((c) => c.id !== chapterId);
    });
    await ImagesDB.removeMany(chapter.pages);
  },

  // Добавление страниц: файлы сортируются по имени (1.jpg, 2.jpg, 10.jpg)
  async addPages(slug, chapterId, files, onProgress) {
    const sorted = [...files]
      .filter((f) => f.type.startsWith('image/'))
      .sort((a, b) => Utils.naturalCompare(a.name, b.name));
    const keys = [];
    for (const [i, file] of sorted.entries()) {
      keys.push(await ImagesDB.put(file));
      if (onProgress) onProgress(i + 1, sorted.length);
    }
    this._changeChapter(slug, chapterId, (ch) => ch.pages.push(...keys));
    return keys.length;
  },

  movePage(slug, chapterId, index, direction) {
    this._changeChapter(slug, chapterId, (ch) => {
      const target = index + direction;
      if (target < 0 || target >= ch.pages.length) return;
      [ch.pages[index], ch.pages[target]] = [ch.pages[target], ch.pages[index]];
    });
  },

  async removePage(slug, chapterId, key) {
    this._changeChapter(slug, chapterId, (ch) => {
      ch.pages = ch.pages.filter((k) => k !== key);
      if (!ch.pages.length) ch.published = false;
    });
    await ImagesDB.remove(key);
  },

  // Скрыть/показать тайтл из файлов (админка)
  setHidden(slug, hidden) {
    Store.update('hidden', [], (list) =>
      hidden ? [...new Set([...list, slug])] : list.filter((s) => s !== slug),
    );
  },
};
