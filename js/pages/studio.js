// Кабинет автора: свои тайтлы, главы и загрузка страниц
Pages._titleFormHtml = (t = {}) => `
  <label>Название *
    <input class="input" name="name" required maxlength="200" value="${Utils.esc(t.name || '')}"></label>
  <label>Альтернативное название
    <input class="input" name="altName" maxlength="200" value="${Utils.esc(t.altName || '')}"></label>
  <label>Описание
    <textarea class="input" name="description" rows="5" maxlength="5000">${Utils.esc(t.description || '')}</textarea></label>
  <div class="form-row">
    <label>Тип <select class="input" name="type">${UI.options(Library.TYPES, t.type || 'MANGA')}</select></label>
    <label>Статус <select class="input" name="status">${UI.options(Library.STATUSES, t.status || 'ONGOING')}</select></label>
  </div>
  <div class="form-row">
    <label>Возраст
      <select class="input" name="ageRating">
        ${Library.AGE_RATINGS.map((a) => `<option value="${a}" ${Number(t.ageRating) === a ? 'selected' : ''}>${a ? a + '+' : 'Для всех'}</option>`).join('')}
      </select></label>
    <label>Год <input class="input" name="year" type="number" min="1900" max="${new Date().getFullYear() + 1}"
      value="${t.year || new Date().getFullYear()}"></label>
  </div>
  <div class="filter-title">Жанры (до 10)</div>
  <div class="genre-checks">
    ${(window.GENRES || [])
      .map(
        (g) => `<label class="check"><input type="checkbox" name="genres" value="${g.slug}"
          ${(t.genres || []).includes(g.slug) ? 'checked' : ''}> ${g.name}</label>`,
      )
      .join('')}
  </div>`;

Pages._readTitleForm = (form) => {
  const genres = [...form.querySelectorAll('[name="genres"]:checked')].map((c) => c.value);
  if (genres.length > 10) throw new Error('Выберите не более 10 жанров');
  return {
    name: form.name.value.trim(),
    altName: form.altName.value.trim(),
    description: form.description.value.trim(),
    type: form.type.value,
    status: form.status.value,
    ageRating: Number(form.ageRating.value),
    year: form.year.value ? Number(form.year.value) : null,
    genres,
  };
};

// ---------- Список тайтлов автора ----------
Pages.studio = async ({ app }) => {
  if (!UI.requireAuth(app, ['AUTHOR', 'ADMIN'])) return;
  const user = Auth.current();
  const titles = Library.all().filter(
    (t) => t.source === 'local' && (user.role === 'ADMIN' || t.ownerId === user.id),
  );

  const statsOf = (t) => {
    const chapters = t.raw.chapters;
    return {
      chapters: chapters.length,
      published: chapters.filter((c) => c.published).length,
      likes: chapters.reduce((s, c) => s + Library.likes(t.slug, c.number).length, 0),
      views: Library.views(t.slug),
    };
  };

  app.innerHTML = `
    <div class="container">
      <div class="section-head">
        <h1 class="page-title">Кабинет автора</h1>
        <button class="btn btn-primary" id="create-title">＋ Новый тайтл</button>
      </div>

      <div class="stats-row">
        <div class="card stat-card"><span class="muted">Тайтлов</span><b>${titles.length}</b></div>
        <div class="card stat-card"><span class="muted">Баланс от донатов</span><b>${Utils.rub(user.balance || 0)}</b>
          <a class="small" href="#/donations">история →</a></div>
        <div class="card stat-card"><span class="muted">Место для картинок</span><b id="storage-info">…</b></div>
      </div>

      ${
        titles.length
          ? `<div class="studio-list">
              ${titles
                .map((t) => {
                  const s = statsOf(t);
                  return `
                    <div class="card studio-item">
                      ${UI.cover(t, 'cover-sm')}
                      <div class="studio-item-info">
                        <a href="#/title/${t.slug}"><b>${Utils.esc(t.name)}</b></a>
                        <div class="muted small">${Library.TYPES[t.type]} · ${Library.STATUSES[t.status]}
                          ${user.role === 'ADMIN' ? ` · автор: ${Utils.esc(t.author)}` : ''}</div>
                        <div class="small">Глав: ${s.published}/${s.chapters} опубл. · 👁 ${s.views} · ♥ ${s.likes}</div>
                      </div>
                      <a class="btn btn-ghost btn-sm" href="#/studio/${t.slug}">Управлять</a>
                    </div>`;
                })
                .join('')}
            </div>`
          : UI.empty(
              'У вас пока нет тайтлов',
              'Нажмите «Новый тайтл», чтобы опубликовать свою первую мангу или комикс.',
            )
      }

      <div class="info-card">
        <h3>Где хранятся загруженные главы?</h3>
        <p>Тайтлы из кабинета автора сохраняются <b>в этом браузере</b> (localStorage + IndexedDB).
          На другом компьютере их не будет. Чтобы манга была видна везде, добавьте её файлами
          в папку <code>manga/</code> проекта.</p>
        <a class="btn btn-ghost" href="#/help">Как добавить мангу файлами</a>
      </div>
    </div>`;

  UI.hydrate(app);

  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(({ usage, quota }) => {
      const mb = (n) => Math.round(n / 1024 / 1024);
      const el = app.querySelector('#storage-info');
      if (el) el.textContent = `${mb(usage)} из ${mb(quota)} МБ`;
    });
  }

  app.querySelector('#create-title').addEventListener('click', () => {
    const { el, close } = UI.modal({
      title: 'Новый тайтл',
      wide: true,
      body: `<form class="form" id="title-form">${Pages._titleFormHtml()}
        <button class="btn btn-primary">Создать</button></form>`,
    });
    el.querySelector('#title-form').addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const raw = Library.createLocal(Pages._readTitleForm(e.target), user.id);
        close();
        UI.toast('Тайтл создан. Загрузите обложку и добавьте главы', 'success');
        Router.go(`/studio/${raw.slug}`);
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    });
  });
};

// ---------- Управление тайтлом ----------
Pages.studioTitle = async (ctx) => {
  const { app, params, query } = ctx;
  if (!UI.requireAuth(app, ['AUTHOR', 'ADMIN'])) return;
  const title = Library.get(params.slug);
  if (!title) return Pages.notFound(ctx);

  if (title.source === 'file') {
    app.innerHTML = `<div class="container">${UI.empty(
      'Этот тайтл загружен из папки manga/',
      `Его данные меняются в файле <code>data/manga.js</code>, а страницы — в папке
       <code>manga/${Utils.esc(title.slug)}/</code>. <a href="#/help">Инструкция</a>`,
    )}</div>`;
    return;
  }
  if (!Library.canEdit(title)) {
    app.innerHTML = `<div class="container">${UI.empty('Можно редактировать только свои тайтлы')}</div>`;
    return;
  }

  const slug = title.slug;
  const chapters = [...title.raw.chapters].sort((a, b) => a.number - b.number);
  const openId = query.ch || null;
  const nextNumber = chapters.length ? Math.floor(chapters[chapters.length - 1].number) + 1 : 1;
  const lastVolume = chapters.length ? chapters[chapters.length - 1].volume : 1;
  const refresh = (ch = openId) => {
    const y = window.scrollY;
    const target = `/studio/${slug}${ch ? `?ch=${ch}` : ''}`;
    if (location.hash.slice(1) === target) Router.resolve().then(() => window.scrollTo(0, y));
    else Router.go(target);
  };

  const chapterHtml = (ch) => {
    const open = ch.id === openId;
    return `
      <div class="card chapter-card" data-id="${ch.id}">
        <div class="chapter-card-head">
          <div>
            <b>Том ${ch.volume} Глава ${ch.number}</b>${ch.name ? ` — ${Utils.esc(ch.name)}` : ''}
            <div class="small muted">
              ${ch.published ? `<span class="badge status-paid">Опубликована</span> ${Utils.formatDate(ch.publishedAt)}` : '<span class="badge badge-draft">Черновик</span>'}
              · ${Utils.plural(ch.pages.length, 'страница', 'страницы', 'страниц')}
              · ♥ ${Library.likes(slug, ch.number).length}
            </div>
          </div>
          <div class="chapter-card-actions">
            <button class="btn btn-ghost btn-sm" data-action="toggle">${open ? 'Свернуть' : 'Страницы'}</button>
            <button class="btn btn-sm ${ch.published ? 'btn-ghost' : 'btn-primary'}" data-action="publish">
              ${ch.published ? 'Снять с публикации' : 'Опубликовать'}</button>
            <button class="btn btn-ghost btn-sm" data-action="edit">✎</button>
            ${ch.pages.length ? `<a class="btn btn-ghost btn-sm" href="#/read/${slug}/${ch.number}">Читать</a>` : ''}
            <button class="btn btn-danger btn-sm" data-action="delete">Удалить</button>
          </div>
        </div>
        ${
          open
            ? `<div class="chapter-pages">
                <label class="upload-box">
                  <input type="file" accept="image/*" multiple data-action="upload" hidden>
                  <b>＋ Загрузить страницы</b>
                  <span class="muted small">Можно выбрать сразу несколько файлов — они отсортируются по имени (1.jpg, 2.jpg, 10.jpg)</span>
                </label>
                <div class="upload-progress muted small"></div>
                <div class="thumbs">
                  ${ch.pages
                    .map(
                      (key, i) => `
                      <div class="thumb">
                        <img data-idb="${key}" alt="">
                        <span class="thumb-num">${i + 1}</span>
                        <div class="thumb-actions">
                          <button data-action="move" data-index="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} title="Раньше">←</button>
                          <button data-action="remove-page" data-key="${key}" title="Удалить">✕</button>
                          <button data-action="move" data-index="${i}" data-dir="1" ${i === ch.pages.length - 1 ? 'disabled' : ''} title="Позже">→</button>
                        </div>
                      </div>`,
                    )
                    .join('')}
                </div>
              </div>`
            : ''
        }
      </div>`;
  };

  app.innerHTML = `
    <div class="container">
      <a href="#/studio" class="muted">← Кабинет автора</a>
      <div class="section-head">
        <h1 class="page-title">${Utils.esc(title.name)}</h1>
        <a class="btn btn-ghost" href="#/title/${slug}">Открыть страницу тайтла</a>
      </div>

      <div class="studio-layout">
        <aside>
          ${UI.cover(title, 'cover-lg')}
          <label class="btn btn-ghost btn-block">Загрузить обложку
            <input type="file" accept="image/*" id="cover-input" hidden></label>
          <button class="btn btn-danger btn-block" id="delete-title">Удалить тайтл</button>
        </aside>

        <div>
          <details class="card" ${chapters.length ? '' : 'open'}>
            <summary><b>Информация о тайтле</b></summary>
            <form class="form" id="title-form">${Pages._titleFormHtml(title)}
              <button class="btn btn-primary">Сохранить</button></form>
          </details>

          <h2 class="section-title">Главы</h2>
          <form class="card form form-inline" id="chapter-form">
            <label>Том <input class="input" name="volume" type="number" min="1" value="${lastVolume}"></label>
            <label>Номер <input class="input" name="number" type="number" min="0.1" step="0.1" value="${nextNumber}" required></label>
            <label class="grow">Название <input class="input" name="name" maxlength="100" placeholder="необязательно"></label>
            <button class="btn btn-primary">＋ Добавить главу</button>
          </form>
          <div id="chapters">
            ${chapters.length ? chapters.map(chapterHtml).join('') : UI.empty('Глав пока нет', 'Добавьте первую главу и загрузите в неё страницы.')}
          </div>
        </div>
      </div>
    </div>`;

  UI.hydrate(app);

  // ---------- Тайтл ----------
  app.querySelector('#title-form').addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      Library.updateLocal(slug, Pages._readTitleForm(e.target));
      UI.toast('Сохранено', 'success');
      refresh();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  });

  app.querySelector('#cover-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await Library.setLocalCover(slug, file);
      UI.toast('Обложка обновлена', 'success');
      refresh();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  });

  app.querySelector('#delete-title').addEventListener('click', async () => {
    const ok = await UI.confirm(`Удалить «${title.name}» со всеми главами? Это нельзя отменить.`, {
      okText: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    await Library.deleteLocal(slug);
    UI.toast('Тайтл удалён');
    Router.go('/studio');
  });

  // ---------- Главы ----------
  app.querySelector('#chapter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      const ch = Library.addChapter(slug, {
        number: form.number.value,
        volume: form.volume.value,
        name: form.name.value,
      });
      UI.toast(`Глава ${ch.number} добавлена. Загрузите страницы`, 'success');
      refresh(ch.id);
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  });

  const chaptersBox = app.querySelector('#chapters');

  chaptersBox.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    const card = e.target.closest('.chapter-card');
    if (!btn || !card || btn.dataset.action === 'upload') return;
    const id = card.dataset.id;
    const ch = chapters.find((c) => c.id === id);

    try {
      switch (btn.dataset.action) {
        case 'toggle':
          refresh(openId === id ? null : id);
          break;
        case 'publish':
          Library.setPublished(slug, id, !ch.published);
          UI.toast(ch.published ? 'Глава снята с публикации' : 'Глава опубликована!', 'success');
          refresh();
          break;
        case 'edit': {
          const { el, close } = UI.modal({
            title: `Глава ${ch.number}`,
            body: `<form class="form" id="edit-chapter">
                <div class="form-row">
                  <label>Том <input class="input" name="volume" type="number" min="1" value="${ch.volume}"></label>
                  <label>Номер <input class="input" name="number" type="number" min="0.1" step="0.1" value="${ch.number}"></label>
                </div>
                <label>Название <input class="input" name="name" maxlength="100" value="${Utils.esc(ch.name)}"></label>
                <button class="btn btn-primary">Сохранить</button></form>`,
          });
          el.querySelector('#edit-chapter').addEventListener('submit', (ev) => {
            ev.preventDefault();
            const f = ev.target;
            try {
              Library.updateChapter(slug, id, {
                volume: Number(f.volume.value) || 1,
                number: Number(f.number.value),
                name: f.name.value.trim(),
              });
              close();
              refresh();
            } catch (err) {
              UI.toast(err.message, 'error');
            }
          });
          break;
        }
        case 'delete':
          if (
            await UI.confirm(`Удалить главу ${ch.number} со всеми страницами?`, {
              okText: 'Удалить',
              danger: true,
            })
          ) {
            await Library.deleteChapter(slug, id);
            UI.toast('Глава удалена');
            refresh(null);
          }
          break;
        case 'move':
          Library.movePage(slug, id, Number(btn.dataset.index), Number(btn.dataset.dir));
          refresh();
          break;
        case 'remove-page':
          await Library.removePage(slug, id, btn.dataset.key);
          refresh();
          break;
      }
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  });

  chaptersBox.addEventListener('change', async (e) => {
    if (e.target.dataset.action !== 'upload') return;
    const card = e.target.closest('.chapter-card');
    const progress = card.querySelector('.upload-progress');
    try {
      const count = await Library.addPages(slug, card.dataset.id, e.target.files, (done, total) => {
        progress.textContent = `Загружено ${done} из ${total}...`;
      });
      UI.toast(`Добавлено страниц: ${count}`, 'success');
      refresh();
    } catch (err) {
      UI.toast('Не удалось сохранить картинки: ' + err.message, 'error');
    }
  });
};
