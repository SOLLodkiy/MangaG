// Запуск приложения: тема, шапка сайта, маршруты
const App = {
  async init() {
    this.applyTheme(Store.get('theme', 'dark'));
    await Auth.init();

    this.renderHeader();
    Auth.onChange(() => this.renderHeader());
    this.bindHeader();

    Router.add('/', Pages.home);
    Router.add('/catalog', Pages.catalog);
    Router.add('/title/:slug', Pages.title);
    Router.add('/read/:slug/:chapter', Pages.reader);
    Router.add('/login', Pages.login);
    Router.add('/register', Pages.register);
    Router.add('/user/:username', Pages.profile);
    Router.add('/bookmarks', ({ app }) => {
      if (!UI.requireAuth(app)) return;
      Router.go(`/user/${Auth.current().username}`);
    });
    Router.add('/donations', Pages.donations);
    Router.add('/pay/:id', Pages.pay);
    Router.add('/studio', Pages.studio);
    Router.add('/studio/:slug', Pages.studioTitle);
    Router.add('/admin', Pages.admin);
    Router.add('/help', Pages.help);
    Router.start();
  },

  applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    Store.set('theme', theme);
  },

  renderHeader() {
    const user = Auth.current();
    const box = document.getElementById('user-menu');
    if (!user) {
      box.innerHTML = `
        <a class="btn btn-ghost btn-sm" href="#/login">Войти</a>
        <a class="btn btn-primary btn-sm hide-mobile" href="#/register">Регистрация</a>`;
      return;
    }
    box.innerHTML = `
      <details class="dropdown">
        <summary>${UI.avatar(user, 34)}</summary>
        <div class="dropdown-menu">
          <div class="dropdown-head">
            <b>${Utils.esc(user.username)}</b>
            <span class="muted small">${Auth.ROLES[user.role]}</span>
          </div>
          <a href="#/user/${Utils.esc(user.username)}">Профиль и закладки</a>
          <a href="#/donations">Донаты</a>
          ${user.role !== 'READER' ? '<a href="#/studio">Кабинет автора</a>' : ''}
          ${user.role === 'ADMIN' ? '<a href="#/admin">Администрирование</a>' : ''}
          <button class="link-btn" id="logout-btn">Выйти</button>
        </div>
      </details>`;
    box.querySelector('#logout-btn').addEventListener('click', () => {
      Auth.logout();
      UI.toast('Вы вышли из аккаунта');
      Router.go('/');
    });
  },

  bindHeader() {
    document.getElementById('search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = e.target.querySelector('input');
      Router.go(Router.build('/catalog', { search: input.value.trim() }));
      input.value = '';
      input.blur();
    });

    document.getElementById('theme-btn').addEventListener('click', () => {
      this.applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });

    // закрываем выпадающее меню при клике мимо него или по пункту
    document.addEventListener('click', (e) => {
      document.querySelectorAll('details.dropdown[open]').forEach((d) => {
        if (!d.contains(e.target) || e.target.closest('.dropdown-menu a, .dropdown-menu button')) {
          d.removeAttribute('open');
        }
      });
    });
  },

  // Подсветка активного пункта меню
  updateNav(path) {
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const target = a.dataset.nav;
      a.classList.toggle('active', target === '/' ? path === '/' : path.startsWith(target));
    });
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
