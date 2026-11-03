// Донаты авторам. Оплата учебная: настоящих денег нет,
// платёжная форма только проверяет номер карты алгоритмом Луна.
const Donations = {
  PRESETS: [50, 100, 300, 500, 1000],
  MIN: 10,
  MAX: 100000,
  STATUSES: { PENDING: 'Ожидает оплаты', PAID: 'Оплачен', FAILED: 'Отклонён' },

  all() {
    return Store.get('donations', []);
  },

  get(id) {
    return this.all().find((d) => d.id === id) || null;
  },

  sentBy(userId) {
    return this.all()
      .filter((d) => d.fromUserId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  receivedBy(user) {
    return this.all()
      .filter(
        (d) =>
          d.status === 'PAID' &&
          (d.toUserId === user.id || (!d.toUserId && d.toAuthor === user.username)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // Сумма оплаченных донатов автору тайтла
  totalForAuthor(authorName) {
    return this.all()
      .filter((d) => d.status === 'PAID' && d.toAuthor === authorName)
      .reduce((sum, d) => sum + d.amount, 0);
  },

  // Топ поддержавших автора
  topSupporters(authorName, limit = 5) {
    const sums = {};
    this.all()
      .filter((d) => d.status === 'PAID' && d.toAuthor === authorName)
      .forEach((d) => (sums[d.fromUserId] = (sums[d.fromUserId] || 0) + d.amount));
    return Object.entries(sums)
      .map(([userId, amount]) => ({ user: Auth.byId(userId), amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  },

  create(title, amount, message) {
    const user = Auth.current();
    if (!user) throw new Error('Войдите, чтобы поддержать автора');
    amount = Math.round(Number(amount));
    if (!(amount >= this.MIN && amount <= this.MAX)) {
      throw new Error(`Сумма от ${this.MIN} до ${Utils.rub(this.MAX)}`);
    }
    const donation = {
      id: Utils.uid(),
      fromUserId: user.id,
      toAuthor: title.author,
      toUserId: title.authorUserId,
      slug: title.slug,
      titleName: title.name,
      amount,
      message: (message || '').trim().slice(0, 300),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      paidAt: null,
    };
    Store.update('donations', [], (list) => {
      list.push(donation);
    });
    return donation;
  },

  // Результат «оплаты». При успехе увеличиваем баланс автора
  finish(id, success, cardLast4) {
    let donation;
    Store.update('donations', [], (list) => {
      donation = list.find((d) => d.id === id);
      donation.status = success ? 'PAID' : 'FAILED';
      donation.paidAt = success ? new Date().toISOString() : null;
      donation.cardLast4 = cardLast4;
    });
    if (success && donation.toUserId) {
      const author = Auth.byId(donation.toUserId);
      if (author) Auth.update(author.id, { balance: (author.balance || 0) + donation.amount });
    }
    return donation;
  },

  // Модальное окно «Поддержать автора»
  openModal(title) {
    if (!Auth.current()) {
      UI.toast('Войдите, чтобы поддержать автора', 'error');
      Router.go(`/login?next=${encodeURIComponent(location.hash.slice(1))}`);
      return;
    }

    const { el, close } = UI.modal({
      title: 'Поддержать автора',
      body: `
        <p class="muted">Автор: <b>${Utils.esc(title.author)}</b> · «${Utils.esc(title.name)}»</p>
        <form class="form" id="donate-form">
          <div class="amount-presets">
            ${this.PRESETS.map(
              (a, i) =>
                `<button type="button" class="chip ${i === 1 ? 'active' : ''}" data-amount="${a}">${Utils.rub(a)}</button>`,
            ).join('')}
          </div>
          <label>Сумма, ₽
            <input name="amount" type="number" min="${this.MIN}" max="${this.MAX}" value="100" required>
          </label>
          <label>Сообщение автору (необязательно)
            <textarea name="message" rows="3" maxlength="300" placeholder="Спасибо за мангу!"></textarea>
          </label>
          <button class="btn btn-donate btn-block">Перейти к оплате</button>
          <p class="muted small">Это учебный проект: оплата имитируется, настоящие деньги не списываются.</p>
        </form>`,
    });

    const form = el.querySelector('#donate-form');
    el.querySelectorAll('[data-amount]').forEach((btn) =>
      btn.addEventListener('click', () => {
        el.querySelectorAll('[data-amount]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        form.amount.value = btn.dataset.amount;
      }),
    );
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const donation = this.create(title, form.amount.value, form.message.value);
        close();
        Router.go(`/pay/${donation.id}`);
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    });
  },
};
