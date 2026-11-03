// Пользователи, регистрация и вход.
// Данные хранятся в localStorage (Store 'users'), сессия — в Store 'session'.
const Auth = {
  ROLES: { READER: 'Читатель', AUTHOR: 'Автор', ADMIN: 'Администратор' },
  DEMO_PASSWORD: 'password123',
  _listeners: [],

  // Демо-аккаунты создаются при первом запуске сайта
  DEMO_USERS: [
    { username: 'admin', email: 'admin@mangag.local', role: 'ADMIN', bio: 'Администратор MangaG' },
    {
      username: 'sakura_ink',
      email: 'author@mangag.local',
      role: 'AUTHOR',
      bio: 'Рисую фэнтези и сёнэн. Спасибо, что читаете!',
    },
    {
      username: 'kuro_pen',
      email: 'author2@mangag.local',
      role: 'AUTHOR',
      bio: 'Пишу мрачные детективы и комиксы про космос.',
    },
    { username: 'reader', email: 'reader@mangag.local', role: 'READER', bio: 'Люблю мангу' },
  ],

  async init() {
    if (!Store.get('users')) {
      const users = [];
      for (const demo of this.DEMO_USERS) {
        const id = Utils.uid();
        users.push({
          id,
          ...demo,
          passwordHash: await Utils.hashPassword(this.DEMO_PASSWORD, id),
          avatar: null,
          balance: 0,
          createdAt: new Date().toISOString(),
        });
      }
      Store.set('users', users);
    }
  },

  // Подписка на вход/выход (обновление шапки и т.п.)
  onChange(listener) {
    this._listeners.push(listener);
  },
  _emit() {
    this._listeners.forEach((fn) => fn(this.current()));
  },

  users() {
    return Store.get('users', []);
  },

  byId(id) {
    return this.users().find((u) => u.id === id) || null;
  },

  byUsername(username) {
    const name = String(username).toLowerCase();
    return this.users().find((u) => u.username.toLowerCase() === name) || null;
  },

  current() {
    const id = Store.get('session', null);
    return id ? this.byId(id) : null;
  },

  hasRole(...roles) {
    const user = this.current();
    return Boolean(user && roles.includes(user.role));
  },

  validateUsername(username) {
    if (username.length < 3 || username.length > 20)
      return 'Имя пользователя — от 3 до 20 символов';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'В имени только латинские буквы, цифры и _';
    return null;
  },

  async register({ email, username, password }) {
    email = email.trim().toLowerCase();
    username = username.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Некорректный email');
    const nameError = this.validateUsername(username);
    if (nameError) throw new Error(nameError);
    if (password.length < 6) throw new Error('Пароль — минимум 6 символов');

    const users = this.users();
    if (users.some((u) => u.email === email)) throw new Error('Этот email уже зарегистрирован');
    if (this.byUsername(username)) throw new Error('Это имя пользователя занято');

    const id = Utils.uid();
    const user = {
      id,
      email,
      username,
      role: 'READER',
      bio: '',
      avatar: null,
      balance: 0,
      passwordHash: await Utils.hashPassword(password, id),
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    Store.set('users', users);
    Store.set('session', id);
    this._emit();
    return user;
  },

  // Вход по email или имени пользователя
  async login(login, password) {
    login = login.trim().toLowerCase();
    const user = this.users().find((u) => u.email === login || u.username.toLowerCase() === login);
    if (!user || user.passwordHash !== (await Utils.hashPassword(password, user.id))) {
      throw new Error('Неверный логин или пароль');
    }
    Store.set('session', user.id);
    this._emit();
    return user;
  },

  logout() {
    Store.remove('session');
    this._emit();
  },

  // Изменение данных пользователя
  update(id, changes) {
    let updated = null;
    Store.update('users', [], (users) => {
      const user = users.find((u) => u.id === id);
      if (user) {
        Object.assign(user, changes);
        updated = user;
      }
    });
    this._emit();
    return updated;
  },

  async changePassword(id, currentPassword, newPassword) {
    const user = this.byId(id);
    if (user.passwordHash !== (await Utils.hashPassword(currentPassword, id))) {
      throw new Error('Текущий пароль указан неверно');
    }
    if (newPassword.length < 6) throw new Error('Новый пароль — минимум 6 символов');
    this.update(id, { passwordHash: await Utils.hashPassword(newPassword, id) });
  },

  remove(id) {
    Store.update('users', [], (users) => users.filter((u) => u.id !== id));
    if (Store.get('session') === id) Store.remove('session');
    this._emit();
  },
};
