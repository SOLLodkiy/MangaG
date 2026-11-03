// История донатов и учебная страница оплаты
Pages.donations = async ({ app, query }) => {
  if (!UI.requireAuth(app)) return;
  const user = Auth.current();
  const isAuthor = user.role !== 'READER';
  const tab = query.tab || (isAuthor ? 'received' : 'sent');

  const list =
    tab === 'received'
      ? Donations.receivedBy(user)
      : tab === 'all' && user.role === 'ADMIN'
        ? [...Donations.all()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : Donations.sentBy(user.id);

  const sentTotal = Donations.sentBy(user.id)
    .filter((d) => d.status === 'PAID')
    .reduce((s, d) => s + d.amount, 0);

  const row = (d) => {
    const from = Auth.byId(d.fromUserId);
    return `
      <tr>
        <td>${Utils.formatDate(d.createdAt)}</td>
        <td><a href="#/title/${d.slug}">${Utils.esc(d.titleName)}</a></td>
        <td>${tab === 'received' ? Utils.esc(from ? from.username : '—') : Utils.esc(d.toAuthor)}</td>
        <td><b>${Utils.rub(d.amount)}</b></td>
        <td class="small">${Utils.esc(d.message || '')}</td>
        <td><span class="badge status-${d.status.toLowerCase()}">${Donations.STATUSES[d.status]}</span>
          ${d.status === 'PENDING' && d.fromUserId === user.id ? `<a href="#/pay/${d.id}" class="small">оплатить</a>` : ''}</td>
      </tr>`;
  };

  app.innerHTML = `
    <div class="container">
      <h1 class="page-title">Донаты</h1>
      <div class="stats-row">
        ${isAuthor ? `<div class="card stat-card"><span class="muted">Баланс автора</span><b>${Utils.rub(user.balance || 0)}</b></div>` : ''}
        <div class="card stat-card"><span class="muted">Вы поддержали авторов на</span><b>${Utils.rub(sentTotal)}</b></div>
      </div>
      <nav class="tabs">
        ${isAuthor ? `<a class="tab ${tab === 'received' ? 'active' : ''}" href="#/donations?tab=received">Полученные</a>` : ''}
        <a class="tab ${tab === 'sent' ? 'active' : ''}" href="#/donations?tab=sent">Отправленные</a>
        ${user.role === 'ADMIN' ? `<a class="tab ${tab === 'all' ? 'active' : ''}" href="#/donations?tab=all">Все донаты</a>` : ''}
      </nav>
      ${
        list.length
          ? `<div class="table-wrap"><table class="table">
              <thead><tr><th>Дата</th><th>Тайтл</th><th>${tab === 'received' ? 'От кого' : 'Автор'}</th>
                <th>Сумма</th><th>Сообщение</th><th>Статус</th></tr></thead>
              <tbody>${list.map(row).join('')}</tbody>
            </table></div>`
          : UI.empty(
              tab === 'received' ? 'Донатов пока нет' : 'Вы ещё никого не поддержали',
              'Кнопка «Поддержать автора» есть на странице каждого тайтла и в конце каждой главы.',
            )
      }
    </div>`;
};

// Учебная платёжная форма. Тестовые карты:
//   4242 4242 4242 4242 — успешная оплата
//   4000 0000 0000 0002 — банк отклонил платёж
Pages.pay = async (ctx) => {
  const { app, params } = ctx;
  if (!UI.requireAuth(app)) return;
  const donation = Donations.get(params.id);
  if (!donation || donation.fromUserId !== Auth.current().id) return Pages.notFound(ctx);

  if (donation.status !== 'PENDING') {
    const ok = donation.status === 'PAID';
    app.innerHTML = `
      <div class="container narrow">
        <div class="card pay-result ${ok ? 'ok' : 'fail'}">
          <div class="pay-icon">${ok ? '✓' : '✕'}</div>
          <h1>${ok ? 'Спасибо за поддержку!' : 'Платёж отклонён'}</h1>
          <p>${ok ? `Автор <b>${Utils.esc(donation.toAuthor)}</b> получил ${Utils.rub(donation.amount)}.` : 'Банк отклонил операцию. Попробуйте другую карту.'}</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/title/${donation.slug}">Вернуться к тайтлу</a>
            <a class="btn btn-ghost" href="#/donations?tab=sent">История донатов</a>
          </div>
        </div>
      </div>`;
    return;
  }

  app.innerHTML = `
    <div class="container narrow">
      <div class="card pay-card">
        <div class="pay-header">
          <b>MangaG Pay</b> <span class="badge">учебный режим</span>
        </div>
        <div class="pay-summary">
          <div class="muted">Донат автору ${Utils.esc(donation.toAuthor)} · «${Utils.esc(donation.titleName)}»</div>
          <div class="pay-amount">${Utils.rub(donation.amount)}</div>
        </div>
        <form class="form" id="pay-form" novalidate>
          <label>Номер карты
            <input class="input" name="card" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="19" required></label>
          <div class="form-row">
            <label>Срок <input class="input" name="exp" placeholder="ММ/ГГ" maxlength="5" required></label>
            <label>CVC <input class="input" name="cvc" type="password" inputmode="numeric" placeholder="123" maxlength="3" required></label>
          </div>
          <p class="form-error" id="pay-error"></p>
          <button class="btn btn-donate btn-block" id="pay-btn">Оплатить ${Utils.rub(donation.amount)}</button>
          <button type="button" class="btn btn-ghost btn-block" id="cancel-btn">Отменить</button>
        </form>
        <div class="pay-hint muted small">
          <b>Тестовые карты</b> (деньги не списываются):<br>
          <code>4242 4242 4242 4242</code> — успешная оплата<br>
          <code>4000 0000 0000 0002</code> — отказ банка<br>
          Срок — любая будущая дата, CVC — любые 3 цифры.
        </div>
      </div>
    </div>`;

  const form = app.querySelector('#pay-form');
  const error = app.querySelector('#pay-error');

  // Формат номера карты: группы по 4 цифры
  form.card.addEventListener('input', () => {
    form.card.value = form.card.value
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, '$1 ');
  });
  form.exp.addEventListener('input', () => {
    const digits = form.exp.value.replace(/\D/g, '').slice(0, 4);
    form.exp.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  });

  app.querySelector('#cancel-btn').addEventListener('click', () => {
    Store.update('donations', [], (list) => list.filter((d) => d.id !== donation.id));
    UI.toast('Платёж отменён');
    Router.go(`/title/${donation.slug}`);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const card = form.card.value.replace(/\s/g, '');
    const [mm, yy] = form.exp.value.split('/').map(Number);
    const expDate = new Date(2000 + yy, mm); // первый день месяца после окончания срока

    if (!Utils.luhn(card) || card.length !== 16)
      return (error.textContent = 'Некорректный номер карты');
    if (!(mm >= 1 && mm <= 12) || !yy || expDate <= new Date())
      return (error.textContent = 'Некорректный срок действия');
    if (!/^\d{3}$/.test(form.cvc.value)) return (error.textContent = 'CVC — 3 цифры');

    error.textContent = '';
    const btn = app.querySelector('#pay-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Обработка платежа...';

    // имитация запроса к банку
    setTimeout(() => {
      const success = !card.endsWith('0002');
      Donations.finish(donation.id, success, card.slice(-4));
      if (ctx.isActive()) Router.resolve();
    }, 1200);
  });
};
