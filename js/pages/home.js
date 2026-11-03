// Главная страница

Pages.home = async ({ app }) => {
  const titles = Library.all();
  const popularity = (t) => Library.views(t.slug) + Library.bookmarksCount(t.slug) * 5;

  const popular = [...titles].sort((a, b) => popularity(b) - popularity(a)).slice(0, 12);
  const fresh = [...titles]
    .sort((a, b) => String(b.createdAt).localeCompare(a.createdAt))
    .slice(0, 12);
  const updated = titles
    .filter((t) => Library.lastUpdate(t))
    .sort((a, b) => Library.lastUpdate(b).localeCompare(Library.lastUpdate(a)))
    .slice(0, 8);

  // «Продолжить чтение» — по сохранённому прогрессу
  const continueList = titles
    .map((t) => ({ title: t, progress: Library.progress(t.slug) }))
    .filter((x) => x.progress)
    .sort((a, b) => b.progress.updatedAt.localeCompare(a.progress.updatedAt))
    .slice(0, 6);

  const hero = popular[0];

  app.innerHTML = `
    <div class="container">
      ${
        hero
          ? `<section class="hero" style="--hue:${Utils.hue(hero.name)}">
              <div class="hero-text">
                <span class="badge">${Library.TYPES[hero.type]}</span>
                <h1>${Utils.esc(hero.name)}</h1>
                <p>${Utils.esc(hero.description.slice(0, 220))}${hero.description.length > 220 ? '…' : ''}</p>
                <div class="hero-actions">
                  <a class="btn btn-primary" href="#/title/${hero.slug}">Подробнее</a>
                  <a class="btn btn-ghost" href="#/catalog">Весь каталог</a>
                </div>
              </div>
              ${UI.cover(hero, 'hero-cover')}
            </section>`
          : ''
      }

      ${
        continueList.length
          ? `<section class="section">
              <h2 class="section-title">Продолжить чтение</h2>
              <div class="continue-list">
                ${continueList
                  .map(
                    ({ title, progress }) => `
                    <a class="continue-item" href="#/read/${title.slug}/${progress.chapter}?p=${progress.page}">
                      ${UI.cover(title, 'cover-sm')}
                      <div>
                        <div class="continue-name">${Utils.esc(title.name)}</div>
                        <div class="muted small">Глава ${progress.chapter} · стр. ${progress.page}</div>
                        <div class="muted small">${Utils.timeAgo(progress.updatedAt)}</div>
                      </div>
                    </a>`,
                  )
                  .join('')}
              </div>
            </section>`
          : ''
      }

      <section class="section">
        <div class="section-head">
          <h2 class="section-title">Популярное</h2>
          <a href="#/catalog?sort=popular">Все →</a>
        </div>
        ${UI.titleGrid(popular, 'В библиотеке пока нет тайтлов')}
      </section>

      ${
        updated.length
          ? `<section class="section">
              <h2 class="section-title">Последние обновления</h2>
              <div class="updates-list">
                ${updated
                  .map(
                    (t) => `
                    <a class="update-item" href="#/title/${t.slug}">
                      ${UI.cover(t, 'cover-xs')}
                      <div>
                        <div>${Utils.esc(t.name)}</div>
                        <div class="muted small">${Utils.timeAgo(Library.lastUpdate(t))}</div>
                      </div>
                    </a>`,
                  )
                  .join('')}
              </div>
            </section>`
          : ''
      }

      <section class="section">
        <div class="section-head">
          <h2 class="section-title">Новинки</h2>
          <a href="#/catalog?sort=new">Все →</a>
        </div>
        ${UI.titleGrid(fresh)}
      </section>

      <section class="section">
        <h2 class="section-title">Жанры</h2>
        <div class="chips">${UI.genreChips((window.GENRES || []).map((g) => g.slug))}</div>
      </section>

      <section class="section info-card">
        <h3>Вы автор?</h3>
        <p>Публикуйте свою мангу и комиксы на MangaG: загружайте главы в «Кабинете автора»,
          собирайте читателей и получайте донаты.</p>
        <a class="btn btn-primary" href="#/studio">Открыть кабинет автора</a>
        <a class="btn btn-ghost" href="#/help">Как добавить мангу</a>
      </section>
    </div>`;

  UI.hydrate(app);
};
