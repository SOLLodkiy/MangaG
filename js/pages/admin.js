// Панель администратора
Pages.admin = async ({ app, query }) => {
  if (!UI.requireAuth(app, ['ADMIN'])) return;
  const me = Auth.current();
  const tab = query.tab || 'users';
  const refresh = () => Router.resolve();

  let body = '';
  if (tab === 'users') {
    body = `<div class="table-wrap"><table class="table">
      <thead><tr><th></th><th>Пользователь</th><th>Email</th><th>Роль</th><th>Регистрация</th><th></th></tr></thead>
      <tbody>
        ${Auth.users()
          .map(
            (u) => `
            <tr data-id="${u.id}">
              <td>${UI.avatar(u, 28)}</td>
              <td><a href="#/user/${Utils.esc(u.username)}">${Utils.esc(u.username)}</a></td>
              <td>${Utils.esc(u.email)}</td>
              <td><select class="input input-sm" data-role ${u.id === me.id ? 'disabled' : ''}>
                ${UI.options(Auth.ROLES, u.role)}</select></td>
              <td class="small">${Utils.formatDate(u.createdAt)}</td>
              <td>${u.id === me.id ? '' : '<button class="btn btn-danger btn-sm" data-delete-user>Удалить</button>'}</td>
            </tr>`,
          )
          .join('')}
      </tbody></table></div>`;
  } else if (tab === 'titles') {
    body = `<div class="table-wrap"><table class="table">
      <thead><tr><th>Тайтл</th><th>Источник</th><th>Автор</th><th>Просмотры</th><th></th></tr></thead>
      <tbody>
        ${Library.allWithHidden()
          .map(
            (t) => `
            <tr data-slug="${t.slug}" data-source="${t.source}">
              <td><a href="#/title/${t.slug}">${Utils.esc(t.name)}</a> ${t.hidden ? '<span class="badge badge-draft">скрыт</span>' : ''}</td>
              <td class="small">${t.source === 'file' ? 'папка manga/' : 'кабинет автора'}</td>
              <td>${Utils.esc(t.author)}</td>
              <td>${Library.views(t.slug)}</td>
              <td>${
                t.source === 'file'
                  ? `<button class="btn btn-ghost btn-sm" data-hide="${t.hidden ? '0' : '1'}">${t.hidden ? 'Показать' : 'Скрыть'}</button>`
                  : '<button class="btn btn-danger btn-sm" data-delete-title>Удалить</button>'
              }</td>
            </tr>`,
          )
          .join('')}
      </tbody></table></div>`;
  } else if (tab === 'comments') {
    const comments = [...Comments.all()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    body = comments.length
      ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Автор</th><th>Где</th><th>Текст</th><th>Дата</th><th></th></tr></thead>
          <tbody>
            ${comments
              .map((c) => {
                const author = Auth.byId(c.userId);
                const title = Library.get(c.slug);
                return `<tr data-id="${c.id}">
                  <td>${Utils.esc(author ? author.username : '—')}</td>
                  <td class="small"><a href="#/title/${c.slug}">${Utils.esc(title ? title.name : c.slug)}</a>
                    ${c.chapter ? `· гл. ${c.chapter}` : ''}</td>
                  <td>${Utils.esc(c.text)}</td>
                  <td class="small">${Utils.timeAgo(c.createdAt)}</td>
                  <td><button class="btn btn-danger btn-sm" data-delete-comment>Удалить</button></td>
                </tr>`;
              })
              .join('')}
          </tbody></table></div>`
      : UI.empty('Комментариев нет');
  } else {
    body = `
      <div class="card">
        <h3>Сброс данных сайта</h3>
        <p>Удаляет всех пользователей (кроме демо-аккаунтов, они создадутся заново), закладки, оценки,
          комментарии, донаты и тайтлы из кабинета автора <b>в этом браузере</b>.
          Манга из папки <code>manga/</code> не затрагивается.</p>
        <button class="btn btn-danger" id="reset-all">Сбросить все данные</button>
      </div>`;
  }

  app.innerHTML = `
    <div class="container">
      <h1 class="page-title">Администрирование</h1>
      <div class="stats-row">
        <div class="card stat-card"><span class="muted">Пользователей</span><b>${Auth.users().length}</b></div>
        <div class="card stat-card"><span class="muted">Тайтлов</span><b>${Library.allWithHidden().length}</b></div>
        <div class="card stat-card"><span class="muted">Комментариев</span><b>${Comments.all().length}</b></div>
        <div class="card stat-card"><span class="muted">Донатов (оплачено)</span>
          <b>${Utils.rub(
            Donations.all()
              .filter((d) => d.status === 'PAID')
              .reduce((s, d) => s + d.amount, 0),
          )}</b></div>
      </div>
      <nav class="tabs">
        <a class="tab ${tab === 'users' ? 'active' : ''}" href="#/admin">Пользователи</a>
        <a class="tab ${tab === 'titles' ? 'active' : ''}" href="#/admin?tab=titles">Тайтлы</a>
        <a class="tab ${tab === 'comments' ? 'active' : ''}" href="#/admin?tab=comments">Комментарии</a>
        <a class="tab ${tab === 'data' ? 'active' : ''}" href="#/admin?tab=data">Данные</a>
      </nav>
      ${body}
    </div>`;

  // ---------- Обработчики ----------
  // вешаем на .container, а не на #app: #app живёт всё время и обработчики бы копились
  const root = app.querySelector('.container');
  root.addEventListener('change', (e) => {
    if (!e.target.matches('[data-role]')) return;
    const id = e.target.closest('tr').dataset.id;
    Auth.update(id, { role: e.target.value });
    UI.toast('Роль изменена', 'success');
  });

  root.addEventListener('click', async (e) => {
    const row = e.target.closest('tr');
    if (e.target.matches('[data-delete-user]')) {
      const user = Auth.byId(row.dataset.id);
      if (
        await UI.confirm(`Удалить пользователя ${user.username}?`, {
          okText: 'Удалить',
          danger: true,
        })
      ) {
        Auth.remove(user.id);
        refresh();
      }
    }
    if (e.target.matches('[data-hide]')) {
      Library.setHidden(row.dataset.slug, e.target.dataset.hide === '1');
      refresh();
    }
    if (e.target.matches('[data-delete-title]')) {
      if (
        await UI.confirm('Удалить тайтл со всеми главами?', { okText: 'Удалить', danger: true })
      ) {
        await Library.deleteLocal(row.dataset.slug);
        refresh();
      }
    }
    if (e.target.matches('[data-delete-comment]')) {
      Comments.remove(row.dataset.id);
      refresh();
    }
    if (e.target.id === 'reset-all') {
      if (
        await UI.confirm('Точно сбросить все данные сайта в этом браузере?', {
          okText: 'Сбросить',
          danger: true,
        })
      ) {
        Store.clearAll();
        await ImagesDB.clear();
        await Auth.init();
        UI.toast('Данные сброшены. Войдите заново');
        App.renderHeader();
        Router.go('/');
      }
    }
  });
};
