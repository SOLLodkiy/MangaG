// Вход и регистрация
Pages.login = async ({ app, query }) => {
  const next = query.next || '/';
  app.innerHTML = `
    <div class="container narrow">
      <div class="card auth-card">
        <h1>Вход</h1>
        <form class="form" id="login-form">
          <label>Email или имя пользователя
            <input class="input" name="login" required autocomplete="username"></label>
          <label>Пароль
            <input class="input" name="password" type="password" required autocomplete="current-password"></label>
          <p class="form-error" id="form-error"></p>
          <button class="btn btn-primary btn-block">Войти</button>
        </form>
        <p class="muted">Нет аккаунта? <a href="#/register?next=${encodeURIComponent(next)}">Зарегистрироваться</a></p>
        <details class="demo-accounts">
          <summary>Демо-аккаунты (пароль: ${Auth.DEMO_PASSWORD})</summary>
          <ul>
            ${Auth.DEMO_USERS.map(
              (
                u,
              ) => `<li><button type="button" class="link-btn" data-demo="${u.email}">${u.email}</button>
                — ${Auth.ROLES[u.role]}</li>`,
            ).join('')}
          </ul>
        </details>
      </div>
    </div>`;

  const form = app.querySelector('#login-form');
  app.querySelectorAll('[data-demo]').forEach((btn) =>
    btn.addEventListener('click', () => {
      form.login.value = btn.dataset.demo;
      form.password.value = Auth.DEMO_PASSWORD;
    }),
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const user = await Auth.login(form.login.value, form.password.value);
      UI.toast(`С возвращением, ${user.username}!`, 'success');
      Router.go(next);
    } catch (err) {
      app.querySelector('#form-error').textContent = err.message;
    }
  });
};

Pages.register = async ({ app, query }) => {
  const next = query.next || '/';
  app.innerHTML = `
    <div class="container narrow">
      <div class="card auth-card">
        <h1>Регистрация</h1>
        <form class="form" id="register-form">
          <label>Email <input class="input" name="email" type="email" required autocomplete="email"></label>
          <label>Имя пользователя
            <input class="input" name="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+"
              autocomplete="username">
            <span class="hint">Латинские буквы, цифры и _ (3–20 символов)</span></label>
          <label>Пароль
            <input class="input" name="password" type="password" required minlength="6" autocomplete="new-password"></label>
          <label>Повторите пароль
            <input class="input" name="password2" type="password" required autocomplete="new-password"></label>
          <p class="form-error" id="form-error"></p>
          <button class="btn btn-primary btn-block">Создать аккаунт</button>
        </form>
        <p class="muted">Уже есть аккаунт? <a href="#/login?next=${encodeURIComponent(next)}">Войти</a></p>
      </div>
    </div>`;

  const form = app.querySelector('#register-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = app.querySelector('#form-error');
    if (form.password.value !== form.password2.value) {
      error.textContent = 'Пароли не совпадают';
      return;
    }
    try {
      await Auth.register({
        email: form.email.value,
        username: form.username.value,
        password: form.password.value,
      });
      UI.toast('Аккаунт создан!', 'success');
      Router.go(next);
    } catch (err) {
      error.textContent = err.message;
    }
  });
};
