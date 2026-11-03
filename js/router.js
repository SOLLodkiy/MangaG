// Простой роутер на hash-адресах: index.html#/title/one-piece
// Hash-адреса работают даже при открытии сайта как файла (без сервера).
// Все страницы сайта регистрируются в этом объекте (файлы js/pages/*.js)
const Pages = {};

const Router = {
  routes: [],
  cleanup: null,
  _token: 0,

  // Router.add('/title/:slug', Pages.title)
  add(pattern, handler) {
    const keys = [];
    const source = pattern.replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
    this.routes.push({ re: new RegExp(`^${source}/?$`), keys, handler });
  },

  current() {
    const hash = location.hash.slice(1) || '/';
    const [path, queryString = ''] = hash.split('?');
    return { path, query: Object.fromEntries(new URLSearchParams(queryString)) };
  },

  go(path) {
    if (location.hash.slice(1) === path) this.resolve();
    else location.hash = path;
  },

  // Собирает адрес с параметрами, пустые значения отбрасываются
  build(path, query = {}) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, v);
    });
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  },

  async resolve() {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
    const token = ++this._token;
    const { path, query } = this.current();
    const app = document.getElementById('app');
    document.body.classList.remove('reader-mode');

    let route = null;
    let params = {};
    for (const r of this.routes) {
      const match = path.match(r.re);
      if (match) {
        route = r;
        r.keys.forEach((key, i) => (params[key] = decodeURIComponent(match[i + 1])));
        break;
      }
    }

    App.updateNav(path);
    window.scrollTo(0, 0);
    const ctx = { app, params, query, path, isActive: () => token === this._token };

    try {
      const cleanup = await (route ? route.handler(ctx) : Pages.notFound(ctx));
      if (ctx.isActive()) this.cleanup = typeof cleanup === 'function' ? cleanup : null;
      else if (typeof cleanup === 'function') cleanup();
    } catch (err) {
      console.error(err);
      if (ctx.isActive()) {
        app.innerHTML = `<div class="container">${UI.empty('Произошла ошибка', Utils.esc(err.message))}</div>`;
      }
    }
  },

  start() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  },
};
