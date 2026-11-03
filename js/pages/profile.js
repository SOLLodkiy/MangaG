// Профиль пользователя: закладки, тайтлы автора, настройки
Pages.profile = async (ctx) => {
  const { app, params, query } = ctx;
  const profile = Auth.byUsername(params.username);
  if (!profile) return Pages.notFound(ctx);

  const me = Auth.current();
  const isMe = me && me.id === profile.id;
  const tab = query.tab || 'bookmarks';
  const list = query.list || 'READING';

  // тайтлы автора: созданные в кабинете + из файлов, где он указан автором
  const titles = Library.all().filter((t) => t.authorUserId === profile.id);
  const bookmarks = Library.bookmarksOf(profile.id);
  const countByList = (key) => Object.values(bookmarks).filter((v) => v === key).length;
  const bookmarked = Object.entries(bookmarks)
    .filter(([, l]) => l === list)
    .map(([slug]) => Library.get(slug))
    .filter(Boolean);

  document.title = `${profile.username} — MangaG`;
  app.innerHTML = `
    <div class="container">
      <section class="profile-head card">
        ${UI.avatar(profile, 96)}
        <div class="profile-info">
          <h1>${Utils.esc(profile.username)}</h1>
          <div class="muted">${Auth.ROLES[profile.role]} · на сайте с ${Utils.formatDate(profile.createdAt)}</div>
          ${profile.bio ? `<p>${Utils.esc(profile.bio)}</p>` : ''}
        </div>
        ${
          isMe
            ? `<div class="profile-actions">
                <button class="btn btn-ghost" id="edit-profile">Редактировать</button>
                ${profile.role === 'READER' ? '<button class="btn btn-primary" id="become-author">Стать автором</button>' : ''}
                <a class="btn btn-ghost" href="#/donations">Мои донаты</a>
                <button class="btn btn-ghost" id="logout">Выйти</button>
              </div>`
            : ''
        }
      </section>

      <nav class="tabs">
        <a class="tab ${tab === 'bookmarks' ? 'active' : ''}" href="#/user/${profile.username}">Закладки</a>
        ${
          profile.role !== 'READER' || titles.length
            ? `<a class="tab ${tab === 'titles' ? 'active' : ''}" href="#/user/${profile.username}?tab=titles">
                Тайтлы автора <span class="muted">${titles.length}</span></a>`
            : ''
        }
      </nav>

      ${
        tab === 'titles'
          ? UI.titleGrid(titles, 'У автора пока нет тайтлов')
          : `<div class="chips list-tabs">
              ${Object.entries(Library.LISTS)
                .map(
                  ([key, label]) =>
                    `<a class="chip ${key === list ? 'active' : ''}"
                      href="#/user/${profile.username}?list=${key}">${label} <span class="muted">${countByList(key)}</span></a>`,
                )
                .join('')}
            </div>
            ${UI.titleGrid(bookmarked, 'В этом списке пока пусто')}`
      }
    </div>`;

  UI.hydrate(app);
  if (!isMe) return;

  app.querySelector('#logout').addEventListener('click', () => {
    Auth.logout();
    UI.toast('Вы вышли из аккаунта');
    Router.go('/');
  });

  app.querySelector('#become-author')?.addEventListener('click', async () => {
    const ok = await UI.confirm(
      'Стать автором? Вы сможете публиковать свою мангу и комиксы в «Кабинете автора» и получать донаты.',
      { okText: 'Стать автором' },
    );
    if (!ok) return;
    Auth.update(profile.id, { role: 'AUTHOR' });
    UI.toast('Теперь вы автор! Откройте «Кабинет автора»', 'success');
    Router.go('/studio');
  });

  app.querySelector('#edit-profile').addEventListener('click', () => {
    const { el, close } = UI.modal({
      title: 'Редактирование профиля',
      body: `
        <form class="form" id="profile-form">
          <div class="avatar-edit">
            ${UI.avatar(profile, 72)}
            <label class="btn btn-ghost btn-sm">Загрузить аватар
              <input type="file" name="avatar" accept="image/*" hidden></label>
            ${profile.avatar ? '<button type="button" class="link-btn danger" id="remove-avatar">Удалить</button>' : ''}
          </div>
          <label>О себе
            <textarea class="input" name="bio" rows="3" maxlength="500">${Utils.esc(profile.bio || '')}</textarea></label>
          <button class="btn btn-primary">Сохранить</button>
        </form>
        <hr>
        <form class="form" id="password-form">
          <div class="filter-title">Смена пароля</div>
          <input class="input" name="current" type="password" placeholder="Текущий пароль" required>
          <input class="input" name="next" type="password" placeholder="Новый пароль (мин. 6 символов)" minlength="6" required>
          <button class="btn btn-ghost">Изменить пароль</button>
        </form>`,
    });

    let avatar = profile.avatar;
    const form = el.querySelector('#profile-form');
    form.avatar.addEventListener('change', async () => {
      const file = form.avatar.files[0];
      if (!file) return;
      try {
        // уменьшаем до 128px, чтобы влезло в localStorage
        avatar = await Utils.blobToDataUrl(await Utils.resizeImage(file, 128, 128, 0.8));
        el.querySelector('.avatar-edit .avatar').outerHTML =
          `<img class="avatar" style="width:72px;height:72px" src="${avatar}" alt="">`;
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    });
    el.querySelector('#remove-avatar')?.addEventListener('click', () => {
      avatar = null;
      el.querySelector('.avatar-edit .avatar').outerHTML = UI.avatar(
        { ...profile, avatar: null },
        72,
      );
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      Auth.update(profile.id, { bio: form.bio.value.trim(), avatar });
      close();
      UI.toast('Профиль сохранён', 'success');
      Router.resolve();
    });

    const pwd = el.querySelector('#password-form');
    pwd.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await Auth.changePassword(profile.id, pwd.current.value, pwd.next.value);
        UI.toast('Пароль изменён', 'success');
        pwd.reset();
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    });
  });
};
