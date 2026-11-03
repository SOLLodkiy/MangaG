// Общие элементы интерфейса: уведомления, модальные окна, карточки, обложки
const UI = {
  // ---------- Уведомления ----------
  toast(message, type = 'info') {
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => el.classList.add('hide'), 3000);
    setTimeout(() => el.remove(), 3400);
  },

  // ---------- Модальные окна ----------
  modal({ title, body, wide = false }) {
    const root = document.getElementById('modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>${Utils.esc(title)}</h3>
          <button class="icon-btn" data-close aria-label="Закрыть">✕</button>
        </div>
        <div class="modal-body">${body}</div>
      </div>`;
    root.appendChild(overlay);

    const onKey = (e) => e.key === 'Escape' && close();
    function close() {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
    }
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('[data-close]')) close();
    });
    document.addEventListener('keydown', onKey);
    UI.hydrate(overlay);
    return { el: overlay.querySelector('.modal'), close };
  },

  confirm(text, { okText = 'Да', danger = false } = {}) {
    return new Promise((resolve) => {
      const { el, close } = UI.modal({
        title: 'Подтверждение',
        body: `<p>${Utils.esc(text)}</p>
          <div class="modal-actions">
            <button class="btn btn-ghost" data-answer="no">Отмена</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-answer="yes">
              ${Utils.esc(okText)}</button>
          </div>`,
      });
      el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-answer]');
        if (!btn) return;
        close();
        resolve(btn.dataset.answer === 'yes');
      });
    });
  },

  // ---------- Картинки ----------

  // Обложка: цветная заглушка с названием + картинка поверх, если она есть
  cover(title, cls = '') {
    let img = '';
    if (title.coverKey) {
      img = `<img data-idb="${title.coverKey}" alt="">`;
    } else {
      const urls = Library.coverUrls(title);
      if (urls.length) img = `<img data-srcs="${Utils.esc(JSON.stringify(urls))}" alt="">`;
    }
    return `<div class="cover ${cls}" style="--hue:${Utils.hue(title.name)}">
      <span class="cover-placeholder">${Utils.esc(title.name)}</span>${img}</div>`;
  },

  // Подставляет src для картинок из IndexedDB и перебирает варианты адресов обложки
  hydrate(root) {
    root.querySelectorAll('img[data-idb]').forEach(async (img) => {
      const key = img.dataset.idb;
      img.removeAttribute('data-idb');
      img.onload = () => img.classList.add('loaded');
      const url = await ImagesDB.url(key).catch(() => null);
      if (url) img.src = url;
      else img.remove();
    });
    root.querySelectorAll('img[data-srcs]').forEach((img) => {
      const list = JSON.parse(img.dataset.srcs);
      img.removeAttribute('data-srcs');
      let i = 0;
      img.onload = () => img.classList.add('loaded');
      img.onerror = () => {
        i += 1;
        if (i < list.length) img.src = list[i];
        else img.remove();
      };
      img.src = list[0];
    });
  },

  avatar(user, size = 36) {
    const style = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px`;
    if (!user) return `<span class="avatar" style="${style}">?</span>`;
    if (user.avatar) {
      return `<img class="avatar" style="${style}" src="${user.avatar}" alt="${Utils.esc(user.username)}">`;
    }
    return `<span class="avatar" style="${style};--hue:${Utils.hue(user.username)}">
      ${Utils.esc(user.username[0].toUpperCase())}</span>`;
  },

  // ---------- Карточки и прочее ----------

  titleCard(title) {
    const rating = Library.rating(title.slug);
    return `
      <a class="title-card" href="#/title/${title.slug}">
        ${UI.cover(title)}
        <div class="title-card-badges">
          <span class="badge">${Library.TYPES[title.type]}</span>
          ${rating.count ? `<span class="badge badge-rating">★ ${rating.avg}</span>` : ''}
        </div>
        <div class="title-card-name">${Utils.esc(title.name)}</div>
        <div class="title-card-sub">${Utils.esc(title.altName || title.author)}</div>
      </a>`;
  },

  titleGrid(titles, emptyText = 'Ничего не найдено') {
    if (!titles.length) return UI.empty(emptyText);
    return `<div class="title-grid">${titles.map(UI.titleCard).join('')}</div>`;
  },

  empty(text, hint = '') {
    return `<div class="empty"><div class="empty-icon">📭</div><p>${Utils.esc(text)}</p>
      ${hint ? `<p class="muted">${hint}</p>` : ''}</div>`;
  },

  loader(text = 'Загрузка...') {
    return `<div class="loader"><span class="spinner"></span>${Utils.esc(text)}</div>`;
  },

  genreChips(slugs) {
    return slugs
      .map(
        (s) =>
          `<a class="chip" href="#/catalog?genres=${s}">${Utils.esc(Library.genreName(s))}</a>`,
      )
      .join('');
  },

  options(map, selected) {
    return Object.entries(map)
      .map(
        ([v, label]) =>
          `<option value="${v}" ${v === selected ? 'selected' : ''}>${label}</option>`,
      )
      .join('');
  },

  // Проверка доступа: показывает сообщение и возвращает false, если прав нет
  requireAuth(app, roles) {
    const user = Auth.current();
    if (!user) {
      app.innerHTML = `<div class="container">${UI.empty(
        'Эта страница доступна только после входа',
        `<a class="btn btn-primary" href="#/login?next=${encodeURIComponent(location.hash.slice(1))}">Войти</a>`,
      )}</div>`;
      return false;
    }
    if (roles && !roles.includes(user.role)) {
      app.innerHTML = `<div class="container">${UI.empty('Недостаточно прав для этой страницы')}</div>`;
      return false;
    }
    return true;
  },
};
