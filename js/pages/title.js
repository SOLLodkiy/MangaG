// Страница тайтла: информация, главы, комментарии, донаты
Pages.title = async (ctx) => {
  const { app, params, query } = ctx;
  const title = Library.get(params.slug);
  if (!title) return Pages.notFound(ctx);

  document.title = `${title.name} — MangaG`;
  const user = Auth.current();
  const tab = query.tab || 'info';
  const rating = Library.rating(title.slug);
  const myRating = user ? Library.myRating(title.slug, user.id) : null;
  const bookmark = user ? Library.bookmark(user.id, title.slug) : null;
  const progress = Library.progress(title.slug);
  const canEdit = Library.canEdit(title);
  const authorUser = title.authorUserId ? Auth.byId(title.authorUserId) : null;
  const donated = Donations.totalForAuthor(title.author);

  app.innerHTML = `
    <div class="title-page">
      <div class="title-backdrop" style="--hue:${Utils.hue(title.name)}"></div>
      <div class="container title-layout">
        <aside class="title-side">
          ${UI.cover(title, 'cover-lg')}
          <div class="title-buttons" id="read-buttons">${UI.loader('Ищем главы...')}</div>

          <select class="input" id="bookmark-select" ${user ? '' : 'disabled'}
            title="${user ? '' : 'Войдите, чтобы добавлять в закладки'}">
            <option value="">${bookmark ? 'Убрать из закладок' : '＋ Добавить в закладки'}</option>
            ${UI.options(Library.LISTS, bookmark)}
          </select>

          <button class="btn btn-donate btn-block" id="donate-btn">♥ Поддержать автора</button>
          ${canEdit && title.source === 'local' ? `<a class="btn btn-ghost btn-block" href="#/studio/${title.slug}">✎ Редактировать</a>` : ''}
          ${
            title.source === 'file' && canEdit
              ? '<p class="muted small">Этот тайтл загружен из папки manga/ — он редактируется в файле data/manga.js</p>'
              : ''
          }
        </aside>

        <div class="title-main">
          <div class="title-type muted">${Library.TYPES[title.type]} · ${title.year || '—'}</div>
          <h1 class="title-name">${Utils.esc(title.name)}</h1>
          ${title.altName ? `<div class="title-alt muted">${Utils.esc(title.altName)}</div>` : ''}

          <div class="title-stats">
            <div class="stat"><b>★ ${rating.count ? rating.avg : '—'}</b><span>${Utils.plural(rating.count, 'оценка', 'оценки', 'оценок')}</span></div>
            <div class="stat"><b>${Utils.formatNumber(Library.views(title.slug))}</b><span>просмотров</span></div>
            <div class="stat"><b>${Library.bookmarksCount(title.slug)}</b><span>в закладках</span></div>
            <div class="stat"><b id="chapters-count">…</b><span>глав</span></div>
          </div>

          <div class="rate-box">
            <span>Ваша оценка:</span>
            <div class="rate-stars" id="rate-stars">
              ${Array.from({ length: 10 }, (_, i) => i + 1)
                .map(
                  (n) =>
                    `<button class="star ${myRating && n <= myRating ? 'on' : ''}" data-score="${n}"
                      title="${n}" ${user ? '' : 'disabled'}>★</button>`,
                )
                .join('')}
            </div>
            ${myRating ? `<span class="muted">${myRating}/10</span>` : ''}
          </div>

          <nav class="tabs">
            <a class="tab ${tab === 'info' ? 'active' : ''}" href="#/title/${title.slug}">Описание</a>
            <a class="tab ${tab === 'chapters' ? 'active' : ''}" href="#/title/${title.slug}?tab=chapters">Главы</a>
            <a class="tab ${tab === 'comments' ? 'active' : ''}" href="#/title/${title.slug}?tab=comments">Комментарии
              <span class="muted">${Comments.list(title.slug).length}</span></a>
          </nav>

          <div id="tab-content"></div>
        </div>
      </div>
    </div>`;

  UI.hydrate(app);
  const tabContent = app.querySelector('#tab-content');

  // ---------- Вкладки ----------
  if (tab === 'info') {
    const top = Donations.topSupporters(title.author);
    tabContent.innerHTML = `
      <p class="description">${Utils.esc(title.description) || '<span class="muted">Описание отсутствует</span>'}</p>
      <div class="chips">${UI.genreChips(title.genres)}</div>
      <dl class="info-list">
        <dt>Автор</dt><dd>${
          authorUser
            ? `<a href="#/user/${Utils.esc(authorUser.username)}">${Utils.esc(title.author)}</a>`
            : Utils.esc(title.author)
        }</dd>
        <dt>Тип</dt><dd>${Library.TYPES[title.type]}</dd>
        <dt>Статус</dt><dd>${Library.STATUSES[title.status]}</dd>
        <dt>Год</dt><dd>${title.year || '—'}</dd>
        <dt>Возраст</dt><dd>${title.ageRating ? title.ageRating + '+' : 'Для всех'}</dd>
      </dl>
      <div class="support-card">
        <div>
          <h3>Поддержите автора</h3>
          <p class="muted">Автор получил донатов: <b>${Utils.rub(donated)}</b></p>
        </div>
        ${
          top.length
            ? `<ol class="top-list">${top
                .map(
                  (x) =>
                    `<li>${UI.avatar(x.user, 24)} ${Utils.esc(x.user ? x.user.username : '—')} <b>${Utils.rub(x.amount)}</b></li>`,
                )
                .join('')}</ol>`
            : '<p class="muted">Станьте первым, кто поддержит автора!</p>'
        }
      </div>`;
    UI.hydrate(tabContent);
  } else if (tab === 'comments') {
    Comments.render(tabContent, { slug: title.slug });
  } else {
    tabContent.innerHTML = UI.loader('Ищем главы...');
  }

  // ---------- Обработчики ----------
  app.querySelector('#donate-btn').addEventListener('click', () => Donations.openModal(title));

  app.querySelector('#bookmark-select').addEventListener('change', (e) => {
    Library.setBookmark(user.id, title.slug, e.target.value || null);
    UI.toast(
      e.target.value ? `Добавлено в «${Library.LISTS[e.target.value]}»` : 'Удалено из закладок',
    );
    Router.resolve();
  });

  app.querySelector('#rate-stars').addEventListener('click', (e) => {
    const star = e.target.closest('[data-score]');
    if (!star || !user) return;
    const score = Number(star.dataset.score);
    Library.setRating(title.slug, user.id, score === myRating ? null : score);
    Router.resolve();
  });

  // ---------- Главы (могут искаться в папке — это асинхронно) ----------
  const chapters = Library.visibleChapters(title, await Library.getChapters(title));
  if (!ctx.isActive()) return;

  app.querySelector('#chapters-count').textContent = chapters.length;
  const published = chapters.filter((c) => c.published);
  const first = published[0];
  const progressChapter = progress && published.find((c) => c.number === progress.chapter);

  const readButtons = app.querySelector('#read-buttons');
  if (progressChapter) {
    readButtons.innerHTML = `
      <a class="btn btn-primary btn-block" href="#/read/${title.slug}/${progress.chapter}?p=${progress.page}">
        Продолжить · гл. ${progress.chapter}</a>
      <a class="btn btn-ghost btn-block" href="#/read/${title.slug}/${first.number}">С начала</a>`;
  } else if (first) {
    readButtons.innerHTML = `<a class="btn btn-primary btn-block" href="#/read/${title.slug}/${first.number}">Начать читать</a>`;
  } else {
    readButtons.innerHTML =
      '<button class="btn btn-primary btn-block" disabled>Глав пока нет</button>';
  }

  if (tab === 'chapters') {
    if (!chapters.length) {
      tabContent.innerHTML =
        title.source === 'file'
          ? `<div class="info-card">
              <h3>Главы ещё не добавлены</h3>
              <p>Положите картинки страниц в папку <code>manga/${Utils.esc(title.slug)}/ch-1/</code>
                (файлы <code>1.jpg</code>, <code>2.jpg</code>, ...), для второй главы — в <code>ch-2/</code> и так далее.
                Затем обновите страницу.</p>
              <a class="btn btn-primary" href="#/help">Подробная инструкция</a>
            </div>`
          : UI.empty('Автор ещё не опубликовал ни одной главы');
      return;
    }

    const order = query.order === 'asc' ? 'asc' : 'desc';
    const sorted = order === 'asc' ? chapters : [...chapters].reverse();
    tabContent.innerHTML = `
      <div class="chapters-toolbar">
        <span class="muted">${Utils.plural(chapters.length, 'глава', 'главы', 'глав')}</span>
        <a class="link-btn" href="#/title/${title.slug}?tab=chapters&order=${order === 'asc' ? 'desc' : 'asc'}">
          ${order === 'asc' ? '↑ Сначала первые' : '↓ Сначала новые'}</a>
      </div>
      <ul class="chapter-list">
        ${sorted
          .map((ch) => {
            const isCurrent = progress && progress.chapter === ch.number;
            const read = progress && ch.number < progress.chapter;
            return `
              <li>
                <a class="chapter-item ${read ? 'read' : ''}" href="#/read/${title.slug}/${ch.number}">
                  <span>Том ${ch.volume} Глава ${ch.number}${ch.name ? ` — ${Utils.esc(ch.name)}` : ''}</span>
                  <span class="muted small">
                    ${!ch.published ? '<span class="badge badge-draft">Черновик</span>' : ''}
                    ${isCurrent ? '<span class="badge">Вы здесь</span>' : ''}
                    ♥ ${Library.likes(title.slug, ch.number).length}
                    ${ch.date ? ' · ' + Utils.formatDate(ch.date) : ''}
                  </span>
                </a>
              </li>`;
          })
          .join('')}
      </ul>`;
  }
};
