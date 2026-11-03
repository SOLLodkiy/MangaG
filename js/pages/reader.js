// Читалка: постраничный режим и режим ленты.
// Адрес: #/read/<slug>/<номер главы>?p=<страница>
const ReaderSettings = {
  DEFAULTS: { mode: 'page', direction: 'ltr', fit: 'width', bg: 'dark', width: 900 },

  get() {
    return { ...this.DEFAULTS, ...Store.get('reader', {}) };
  },

  save(changes) {
    Store.set('reader', { ...this.get(), ...changes });
  },
};

Pages.reader = async (ctx) => {
  const { app, params, query } = ctx;
  const title = Library.get(params.slug);
  if (!title) return Pages.notFound(ctx);

  app.innerHTML = `<div class="container">${UI.loader('Загружаем главу...')}</div>`;
  const chapters = Library.visibleChapters(title, await Library.getChapters(title));
  const index = chapters.findIndex((c) => c.number === Number(params.chapter));
  if (!ctx.isActive()) return;
  if (index === -1) return Pages.notFound(ctx);

  const chapter = chapters[index];
  const prevChapter = chapters[index - 1] || null;
  const nextChapter = chapters[index + 1] || null;
  const pages = await Library.getPages(title, chapter);
  if (!ctx.isActive()) return;

  const settings = ReaderSettings.get();
  const total = pages.length;
  let current = Math.min(Math.max(1, Number(query.p) || 1), Math.max(total, 1));
  const user = Auth.current();

  Library.addView(title.slug, chapter.number);
  document.title = `${title.name} · Глава ${chapter.number} — MangaG`;
  document.body.classList.add('reader-mode');

  const chapterLink = (ch, page) => `#/read/${title.slug}/${ch.number}${page ? `?p=${page}` : ''}`;
  const chapterLabel = (ch) => `Глава ${ch.number}${ch.name ? ` — ${ch.name}` : ''}`;

  // ---------- Разметка ----------
  app.innerHTML = `
    <div class="reader bg-${settings.bg} mode-${settings.mode} fit-${settings.fit}"
      style="--reader-width:${settings.width}px">
      <header class="reader-bar reader-top">
        <a class="icon-btn" href="#/title/${title.slug}?tab=chapters" title="К тайтлу">←</a>
        <div class="reader-title">
          <b>${Utils.esc(title.name)}</b>
          <span class="muted small">Том ${chapter.volume}</span>
        </div>
        <select class="input input-sm" id="chapter-select">
          ${chapters
            .map(
              (ch) =>
                `<option value="${ch.number}" ${ch === chapter ? 'selected' : ''}>${Utils.esc(chapterLabel(ch))}</option>`,
            )
            .join('')}
        </select>
        <span class="page-counter" id="page-counter"></span>
        <button class="icon-btn" id="settings-btn" title="Настройки">⚙</button>
      </header>

      <div class="reader-content" id="reader-content"></div>

      <footer class="reader-bar reader-bottom">
        <a class="btn btn-ghost btn-sm ${prevChapter ? '' : 'disabled'}"
          href="${prevChapter ? chapterLink(prevChapter) : '#'}">← Пред. глава</a>
        ${
          settings.mode === 'page' && total > 1
            ? `<input type="range" id="page-range" min="1" max="${total}" value="${current}">`
            : '<span class="spacer"></span>'
        }
        <a class="btn btn-ghost btn-sm ${nextChapter ? '' : 'disabled'}"
          href="${nextChapter ? chapterLink(nextChapter) : '#'}">След. глава →</a>
      </footer>
    </div>`;

  const reader = app.querySelector('.reader');
  const content = app.querySelector('#reader-content');
  const counter = app.querySelector('#page-counter');

  // Адрес картинки страницы (из папки или из IndexedDB)
  const srcOf = async (page) => (page.key ? ImagesDB.url(page.key) : page.src);

  const brokenHtml = (page, n) =>
    `<div class="page-error">Не удалось загрузить страницу ${n}
      ${page.src ? `<br><code>${Utils.esc(page.src)}</code>` : ''}</div>`;

  // ---------- Экран «Глава прочитана» ----------
  const endHtml = () => {
    const likes = Library.likes(title.slug, chapter.number);
    const liked = user && likes.includes(user.id);
    return `
      <div class="chapter-end">
        <h2>Глава ${chapter.number} прочитана!</h2>
        <div class="chapter-end-actions">
          ${
            nextChapter
              ? `<a class="btn btn-primary" href="${chapterLink(nextChapter)}">Следующая глава →</a>`
              : '<p class="muted">Это последняя доступная глава. Добавьте тайтл в закладки, чтобы не пропустить продолжение!</p>'
          }
          <button class="btn ${liked ? 'btn-primary' : 'btn-ghost'}" id="like-btn">
            ♥ ${liked ? 'Понравилось' : 'Нравится'} · ${likes.length}</button>
          <button class="btn btn-donate" id="end-donate-btn">Поддержать автора</button>
        </div>
        <div class="chapter-comments" id="chapter-comments"></div>
      </div>`;
  };

  const bindEnd = () => {
    const likeBtn = content.querySelector('#like-btn');
    if (!likeBtn) return;
    likeBtn.addEventListener('click', () => {
      if (!user) {
        UI.toast('Войдите, чтобы ставить лайки', 'error');
        return;
      }
      Library.toggleLike(title.slug, chapter.number, user.id);
      const likes = Library.likes(title.slug, chapter.number);
      const liked = likes.includes(user.id);
      likeBtn.className = `btn ${liked ? 'btn-primary' : 'btn-ghost'}`;
      likeBtn.textContent = `♥ ${liked ? 'Понравилось' : 'Нравится'} · ${likes.length}`;
    });
    content
      .querySelector('#end-donate-btn')
      .addEventListener('click', () => Donations.openModal(title));
    Comments.render(content.querySelector('#chapter-comments'), {
      slug: title.slug,
      chapter: chapter.number,
    });
  };

  // ---------- Пустая глава ----------
  if (!total) {
    content.innerHTML = `
      <div class="chapter-end">
        <h2>В этой главе пока нет страниц</h2>
        ${
          title.source === 'file'
            ? `<p>Положите картинки в папку <code>${Utils.esc(chapter.folder)}/</code>
                с именами <code>1.jpg</code>, <code>2.jpg</code>, ... и обновите страницу.</p>
               <a class="btn btn-primary" href="#/help">Как добавить мангу</a>`
            : '<p class="muted">Автор ещё не загрузил страницы.</p>'
        }
      </div>`;
    counter.textContent = '0 / 0';
    return () => document.body.classList.remove('reader-mode');
  }

  const saveProgress = () => {
    Library.saveProgress(title.slug, chapter.number, Math.min(current, total));
    history.replaceState(null, '', chapterLink(chapter, Math.min(current, total)));
  };

  const cleanups = [() => document.body.classList.remove('reader-mode')];

  // ================= Постраничный режим =================
  if (settings.mode === 'page') {
    content.innerHTML = `
      <div class="page-view" id="page-view">
        <img id="page-img" alt="">
        <div class="page-zone page-zone-left" data-zone="left"></div>
        <div class="page-zone page-zone-center" data-zone="center"></div>
        <div class="page-zone page-zone-right" data-zone="right"></div>
      </div>
      <div class="page-end hidden" id="page-end"></div>`;

    const view = content.querySelector('#page-view');
    const img = content.querySelector('#page-img');
    const endBox = content.querySelector('#page-end');
    const range = app.querySelector('#page-range');

    const show = async (n) => {
      current = Math.min(Math.max(1, n), total + 1);
      const isEnd = current > total;
      view.classList.toggle('hidden', isEnd);
      endBox.classList.toggle('hidden', !isEnd);
      counter.textContent = isEnd ? 'Конец главы' : `${current} / ${total}`;
      if (range && !isEnd) range.value = current;

      if (isEnd) {
        if (!endBox.innerHTML) {
          endBox.innerHTML = endHtml();
          bindEnd();
        }
        window.scrollTo(0, 0);
        return;
      }

      saveProgress();
      const page = pages[current - 1];
      const n0 = current;
      view.querySelector('.page-error')?.remove();
      img.classList.remove('hidden');
      img.onerror = () => {
        img.classList.add('hidden');
        view.insertAdjacentHTML('afterbegin', brokenHtml(page, n0));
      };
      img.src = (await srcOf(page)) || '';
      window.scrollTo(0, 0);

      // предзагрузка двух следующих страниц
      for (const next of pages.slice(current, current + 2)) {
        srcOf(next).then((src) => {
          if (src) new Image().src = src;
        });
      }
    };

    // «вперёд» и «назад» с учётом направления чтения (для манги — справа налево)
    const forward = () => {
      if (current <= total) show(current + 1);
      else if (nextChapter) location.hash = chapterLink(nextChapter);
    };
    const back = () => {
      if (current > 1) show(current - 1);
      else if (prevChapter) location.hash = chapterLink(prevChapter);
    };
    const rtl = settings.direction === 'rtl';

    view.addEventListener('click', (e) => {
      const zone = e.target.dataset.zone;
      if (zone === 'center') reader.classList.toggle('bars-hidden');
      if (zone === 'left') (rtl ? forward : back)();
      if (zone === 'right') (rtl ? back : forward)();
    });

    // Свайпы на телефоне
    let touchX = null;
    view.addEventListener('touchstart', (e) => (touchX = e.touches[0].clientX), { passive: true });
    view.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) < 50) return;
      if (dx < 0) (rtl ? back : forward)();
      else (rtl ? forward : back)();
    });

    if (range) range.addEventListener('input', () => show(Number(range.value)));

    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (document.querySelector('.modal-overlay')) return;
      const key = e.key.toLowerCase();
      if (key === 'arrowright' || key === 'd' || key === 'в') (rtl ? back : forward)();
      if (key === 'arrowleft' || key === 'a' || key === 'ф') (rtl ? forward : back)();
    };
    document.addEventListener('keydown', onKey);
    cleanups.push(() => document.removeEventListener('keydown', onKey));

    show(current);
  }

  // ================= Режим ленты =================
  else {
    content.innerHTML = `
      <div class="strip">
        ${pages.map((_, i) => `<div class="strip-page" data-n="${i + 1}"><img alt="Страница ${i + 1}" loading="lazy"></div>`).join('')}
      </div>
      ${endHtml()}`;
    bindEnd();

    const items = [...content.querySelectorAll('.strip-page')];
    items.forEach(async (item, i) => {
      const img = item.querySelector('img');
      img.onerror = () => (item.innerHTML = brokenHtml(pages[i], i + 1));
      img.src = (await srcOf(pages[i])) || '';
    });

    // Какая страница сейчас на экране — для счётчика и прогресса
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;
        current = Number(visible[visible.length - 1].target.dataset.n);
        counter.textContent = `${current} / ${total}`;
        saveProgress();
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    items.forEach((item) => observer.observe(item));
    cleanups.push(() => observer.disconnect());

    counter.textContent = `${current} / ${total}`;
    content.addEventListener('click', (e) => {
      if (e.target.tagName === 'IMG') reader.classList.toggle('bars-hidden');
    });
    // прокрутка к сохранённой странице
    if (current > 1) {
      requestAnimationFrame(() => items[current - 1].scrollIntoView());
    }
  }

  // ---------- Общие обработчики ----------
  app.querySelector('#chapter-select').addEventListener('change', (e) => {
    location.hash = `#/read/${title.slug}/${e.target.value}`;
  });

  app.querySelector('#settings-btn').addEventListener('click', () => {
    const s = ReaderSettings.get();
    const radio = (name, value, label) =>
      `<label class="radio"><input type="radio" name="${name}" value="${value}" ${s[name] === value ? 'checked' : ''}> ${label}</label>`;
    const { el, close } = UI.modal({
      title: 'Настройки читалки',
      body: `
        <form class="form" id="reader-settings">
          <div class="filter-title">Режим чтения</div>
          ${radio('mode', 'page', 'Постранично')}
          ${radio('mode', 'strip', 'Лента (вертикально)')}
          <div class="filter-title">Направление (постраничный режим)</div>
          ${radio('direction', 'ltr', 'Слева направо (комиксы, манхва)')}
          ${radio('direction', 'rtl', 'Справа налево (японская манга)')}
          <div class="filter-title">Размер страницы</div>
          ${radio('fit', 'height', 'По высоте экрана')}
          ${radio('fit', 'width', 'По ширине')}
          <label>Максимальная ширина: <span id="width-value">${s.width}</span>px
            <input type="range" name="width" min="400" max="1600" step="50" value="${s.width}">
          </label>
          <div class="filter-title">Фон</div>
          ${radio('bg', 'dark', 'Тёмный')}
          ${radio('bg', 'light', 'Светлый')}
          <button class="btn btn-primary btn-block">Применить</button>
        </form>
        <p class="muted small">Клавиши: ← → или A / D — листать, клик по центру — скрыть панели.</p>`,
    });
    const form = el.querySelector('#reader-settings');
    form.width.addEventListener(
      'input',
      () => (el.querySelector('#width-value').textContent = form.width.value),
    );
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      ReaderSettings.save({
        mode: form.mode.value,
        direction: form.direction.value,
        fit: form.fit.value,
        bg: form.bg.value,
        width: Number(form.width.value),
      });
      close();
      Router.resolve();
    });
  });

  return () => cleanups.forEach((fn) => fn());
};
