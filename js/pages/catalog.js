// Каталог: поиск, фильтры, сортировка, пагинация.
// Все параметры хранятся в адресе: #/catalog?search=...&genres=action,drama&page=2
Pages.CATALOG_PAGE_SIZE = 24;

Pages.catalog = async ({ app, query }) => {
  const search = (query.search || '').trim();
  const genres = query.genres ? query.genres.split(',') : [];
  const types = query.types ? query.types.split(',') : [];
  const statuses = query.statuses ? query.statuses.split(',') : [];
  const sort = query.sort || 'popular';
  const page = Math.max(1, Number(query.page) || 1);

  // ---------- Фильтрация ----------
  let list = Library.all();
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((t) => [t.name, t.altName, t.author].join(' ').toLowerCase().includes(q));
  }
  if (genres.length) list = list.filter((t) => genres.every((g) => t.genres.includes(g)));
  if (types.length) list = list.filter((t) => types.includes(t.type));
  if (statuses.length) list = list.filter((t) => statuses.includes(t.status));

  const sorters = {
    popular: (a, b) =>
      Library.views(b.slug) +
      Library.bookmarksCount(b.slug) * 5 -
      (Library.views(a.slug) + Library.bookmarksCount(a.slug) * 5),
    rating: (a, b) => Library.rating(b.slug).avg - Library.rating(a.slug).avg,
    new: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
    updated: (a, b) =>
      String(Library.lastUpdate(b) || '').localeCompare(String(Library.lastUpdate(a) || '')),
    name: (a, b) => a.name.localeCompare(b.name, 'ru'),
  };
  list.sort(sorters[sort] || sorters.popular);

  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / Pages.CATALOG_PAGE_SIZE));
  const items = list.slice((page - 1) * Pages.CATALOG_PAGE_SIZE, page * Pages.CATALOG_PAGE_SIZE);

  // ---------- Разметка ----------
  const state = { search, genres, types, statuses, sort };
  const link = (changes) => {
    const s = { ...state, ...changes };
    return (
      '#' +
      Router.build('/catalog', {
        search: s.search,
        genres: s.genres.join(','),
        types: s.types.join(','),
        statuses: s.statuses.join(','),
        sort: s.sort === 'popular' ? '' : s.sort,
        page: s.page > 1 ? s.page : '',
      })
    );
  };
  const toggle = (arr, value) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const chipGroup = (title, entries, selected, key) => `
    <div class="filter-group">
      <div class="filter-title">${title}</div>
      <div class="chips">
        ${entries
          .map(
            ([value, label]) =>
              `<a class="chip ${selected.includes(value) ? 'active' : ''}"
                href="${link({ [key]: toggle(selected, value) })}">${Utils.esc(label)}</a>`,
          )
          .join('')}
      </div>
    </div>`;

  const pagination = () => {
    if (pages <= 1) return '';
    let html = '<nav class="pagination">';
    for (let p = 1; p <= pages; p++) {
      html += `<a class="page-btn ${p === page ? 'active' : ''}" href="${link({ page: p })}">${p}</a>`;
    }
    return html + '</nav>';
  };

  const hasFilters = search || genres.length || types.length || statuses.length;

  app.innerHTML = `
    <div class="container">
      <h1 class="page-title">Каталог</h1>
      <div class="catalog">
        <aside class="catalog-filters">
          <input class="input" id="catalog-search" type="search" placeholder="Название или автор..."
            value="${Utils.esc(search)}">
          ${chipGroup('Тип', Object.entries(Library.TYPES), types, 'types')}
          ${chipGroup('Статус', Object.entries(Library.STATUSES), statuses, 'statuses')}
          ${chipGroup(
            'Жанры',
            (window.GENRES || []).map((g) => [g.slug, g.name]),
            genres,
            'genres',
          )}
          ${hasFilters ? '<a class="btn btn-ghost btn-block" href="#/catalog">Сбросить фильтры</a>' : ''}
        </aside>
        <div class="catalog-results">
          <div class="catalog-toolbar">
            <span class="muted">Найдено: ${total}</span>
            <select class="input input-sm" id="catalog-sort">
              ${UI.options(
                {
                  popular: 'Популярные',
                  rating: 'По рейтингу',
                  new: 'Новинки',
                  updated: 'Обновлённые',
                  name: 'По названию',
                },
                sort,
              )}
            </select>
          </div>
          ${UI.titleGrid(items, 'По вашему запросу ничего не найдено')}
          ${pagination()}
        </div>
      </div>
    </div>`;

  UI.hydrate(app);

  const searchInput = app.querySelector('#catalog-search');
  if (Pages._catalogFocus) {
    searchInput.focus();
    searchInput.setSelectionRange(search.length, search.length);
    Pages._catalogFocus = false;
  }
  searchInput.addEventListener(
    'input',
    Utils.debounce(() => {
      Pages._catalogFocus = true;
      location.hash = link({ search: searchInput.value.trim(), page: 1 });
    }, 400),
  );
  app.querySelector('#catalog-sort').addEventListener('change', (e) => {
    location.hash = link({ sort: e.target.value, page: 1 });
  });
};
