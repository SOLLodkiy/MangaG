// «База данных» сайта — localStorage браузера.
// Все ключи начинаются с префикса mangag_, значения хранятся в JSON.
//
// Что где лежит:
//   users       — пользователи
//   session     — id вошедшего пользователя
//   titles      — тайтлы, созданные через «Кабинет автора»
//   bookmarks   — { userId: { slug: 'READING' | ... } }
//   progress    — { userId: { slug: { chapter, page, updatedAt } } }
//   ratings     — { slug: { userId: 1..10 } }
//   comments    — [{ id, slug, chapter, userId, text, parentId, createdAt }]
//   likes       — { 'slug#chapter': [userId, ...] }
//   views       — { slug: число, 'slug#chapter': число }
//   donations   — [{ id, fromUserId, toAuthor, toUserId, slug, amount, message, status, ... }]
//   hidden      — slug тайтлов из файлов, скрытых администратором
//   reader      — настройки читалки
//   theme       — 'dark' | 'light'
const Store = {
  PREFIX: 'mangag_',

  get(key, defaultValue) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw === null ? defaultValue : JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(e);
      UI.toast('Не удалось сохранить данные: память браузера переполнена', 'error');
      return false;
    }
  },

  // Прочитать, изменить и сохранить: Store.update('views', {}, (v) => { v.x = 1; })
  update(key, defaultValue, change) {
    const value = this.get(key, defaultValue);
    const result = change(value);
    this.set(key, result === undefined ? value : result);
    return result === undefined ? value : result;
  },

  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  // Полный сброс данных сайта (для админки)
  clearAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(this.PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },
};
