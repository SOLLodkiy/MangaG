// Комментарии к тайтлу (chapter = null) или к главе (chapter = номер главы).
// Ответы — один уровень вложенности.
const Comments = {
  MAX_LENGTH: 2000,

  all() {
    return Store.get('comments', []);
  },

  list(slug, chapter = null) {
    return this.all()
      .filter((c) => c.slug === slug && (c.chapter ?? null) === chapter)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  add({ slug, chapter = null, text, parentId = null }) {
    const user = Auth.current();
    if (!user) throw new Error('Войдите, чтобы оставлять комментарии');
    text = text.trim();
    if (!text) throw new Error('Комментарий пустой');
    if (text.length > this.MAX_LENGTH) throw new Error('Слишком длинный комментарий');

    const comment = {
      id: Utils.uid(),
      slug,
      chapter,
      userId: user.id,
      text,
      parentId,
      createdAt: new Date().toISOString(),
    };
    Store.update('comments', [], (list) => {
      list.push(comment);
    });
    return comment;
  },

  // Удаление вместе с ответами
  remove(id) {
    Store.update('comments', [], (list) => list.filter((c) => c.id !== id && c.parentId !== id));
  },

  canDelete(comment, user = Auth.current()) {
    return Boolean(user && (user.role === 'ADMIN' || user.id === comment.userId));
  },

  _itemHtml(c, replies = []) {
    const author = Auth.byId(c.userId);
    const user = Auth.current();
    return `
      <div class="comment" data-id="${c.id}">
        ${UI.avatar(author, 36)}
        <div class="comment-body">
          <div class="comment-head">
            ${
              author
                ? `<a href="#/user/${Utils.esc(author.username)}">${Utils.esc(author.username)}</a>`
                : '<span class="muted">Удалённый пользователь</span>'
            }
            <span class="muted">${Utils.timeAgo(c.createdAt)}</span>
          </div>
          <div class="comment-text">${Utils.esc(c.text)}</div>
          <div class="comment-actions">
            ${user && !c.parentId ? `<button class="link-btn" data-reply="${c.id}">Ответить</button>` : ''}
            ${this.canDelete(c, user) ? `<button class="link-btn danger" data-delete="${c.id}">Удалить</button>` : ''}
          </div>
          <div class="reply-slot"></div>
          ${replies.length ? `<div class="replies">${replies.map((r) => this._itemHtml(r)).join('')}</div>` : ''}
        </div>
      </div>`;
  },

  _formHtml(placeholder = 'Напишите комментарий...') {
    return `
      <form class="comment-form">
        <textarea name="text" rows="3" maxlength="${this.MAX_LENGTH}" placeholder="${placeholder}" required></textarea>
        <div class="comment-form-actions"><button class="btn btn-primary btn-sm">Отправить</button></div>
      </form>`;
  },

  // Рисует блок комментариев в container и навешивает обработчики
  render(container, { slug, chapter = null }) {
    const draw = () => {
      const list = this.list(slug, chapter);
      const roots = list.filter((c) => !c.parentId);
      const user = Auth.current();

      container.innerHTML = `
        <h3 class="section-title">Комментарии <span class="muted">${list.length}</span></h3>
        ${
          user
            ? this._formHtml()
            : `<p class="muted"><a href="#/login?next=${encodeURIComponent(location.hash.slice(1))}">Войдите</a>, чтобы оставить комментарий</p>`
        }
        <div class="comment-list">
          ${
            roots.length
              ? roots
                  .map((c) =>
                    this._itemHtml(
                      c,
                      list.filter((r) => r.parentId === c.id),
                    ),
                  )
                  .join('')
              : '<p class="muted">Комментариев пока нет — будьте первым!</p>'
          }
        </div>`;
    };

    container.onsubmit = (e) => {
      e.preventDefault();
      const form = e.target;
      try {
        this.add({ slug, chapter, text: form.text.value, parentId: form.dataset.parent || null });
        draw();
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    };

    container.onclick = async (e) => {
      const replyBtn = e.target.closest('[data-reply]');
      const deleteBtn = e.target.closest('[data-delete]');
      if (replyBtn) {
        const slot = replyBtn.closest('.comment').querySelector('.reply-slot');
        if (slot.innerHTML) {
          slot.innerHTML = '';
          return;
        }
        slot.innerHTML = this._formHtml('Ваш ответ...');
        slot.querySelector('form').dataset.parent = replyBtn.dataset.reply;
        slot.querySelector('textarea').focus();
      }
      if (
        deleteBtn &&
        (await UI.confirm('Удалить комментарий?', { okText: 'Удалить', danger: true }))
      ) {
        this.remove(deleteBtn.dataset.delete);
        draw();
      }
    };

    draw();
  },
};
