// Справка и страница 404
Pages.notFound = async ({ app }) => {
  document.title = 'Страница не найдена — MangaG';
  app.innerHTML = `
    <div class="container">
      <div class="empty">
        <div class="big-404">404</div>
        <p>Такой страницы нет. Возможно, тайтл был удалён или ссылка набрана с ошибкой.</p>
        <a class="btn btn-primary" href="#/">На главную</a>
        <a class="btn btn-ghost" href="#/catalog">В каталог</a>
      </div>
    </div>`;
};

Pages.help = async ({ app }) => {
  document.title = 'Как добавить мангу — MangaG';
  const example = (window.MANGA_LIBRARY || []).find((t) => t.slug === 'chainsaw-man');
  app.innerHTML = `
    <div class="container narrow-wide">
      <h1 class="page-title">Как добавить мангу</h1>
      <p>Есть два способа. Первый — через сайт (быстро, но только в этом браузере).
        Второй — файлами в папке проекта (манга будет видна на любом компьютере).</p>

      <div class="card help-section">
        <h2>Способ 1. Через «Кабинет автора»</h2>
        <ol>
          <li>Войдите как автор (демо: <code>author@mangag.local</code> / <code>${Auth.DEMO_PASSWORD}</code>)
            или нажмите «Стать автором» в своём профиле.</li>
          <li>Откройте <a href="#/studio">Кабинет автора</a> → «Новый тайтл», заполните название и жанры.</li>
          <li>Загрузите обложку, добавьте главу и нажмите «Страницы» → «Загрузить страницы».
            Выделите сразу все картинки главы (Ctrl+A в окне выбора файлов).</li>
          <li>Нажмите «Опубликовать».</li>
        </ol>
        <p class="muted">Картинки сохраняются в браузере. Если очистить данные браузера или открыть сайт
          на другом компьютере — их не будет.</p>
      </div>

      <div class="card help-section">
        <h2>Способ 2. Файлами в папке <code>manga/</code> (навсегда)</h2>
        <ol>
          <li>В папке проекта откройте <code>manga/</code>. Для каждой манги там своя папка,
            например <code>manga/chainsaw-man/</code>. Для новых манг создайте папку с латинским именем.</li>
          <li>Положите туда обложку <code>cover.jpg</code>.</li>
          <li>Создайте папку главы <code>ch-1</code> и положите в неё страницы, названные по порядку:
            <code>1.jpg</code>, <code>2.jpg</code>, <code>3.jpg</code>, ... Подходят и <code>001.jpg</code>,
            и png/webp. Вторая глава — папка <code>ch-2</code> и так далее.</li>
          <li>Если манги ещё нет в списке, добавьте её описание в файл <code>data/manga.js</code>
            (скопируйте любой блок <code>{ ... },</code> и поменяйте поля).</li>
          <li>Обновите страницу сайта (F5). Главы и страницы найдутся сами.</li>
        </ol>
        <pre class="code">manga/
  chainsaw-man/
    cover.jpg
    ch-1/
      1.jpg
      2.jpg
      ...
    ch-2/
      1.jpg
      ...</pre>
        ${
          example
            ? `<p>Пример: у манги «${Utils.esc(example.name)}» папка — <code>manga/${example.slug}/</code>.
                <a href="#/title/${example.slug}">Открыть её страницу</a></p>`
            : ''
        }
      </div>

      <div class="card help-section">
        <h2>Как сохранить страницы манги с сайта</h2>
        <ol>
          <li>Откройте главу в читалке сайта-источника.</li>
          <li>Нажмите правой кнопкой мыши на страницу → «Сохранить картинку как...».</li>
          <li>В окне сохранения выберите папку главы (например <code>manga/chainsaw-man/ch-1</code>)
            и в поле «Имя файла» впишите номер страницы: <code>1</code>, потом <code>2</code> и т.д.</li>
          <li>Если файлы уже скачаны с другими именами: выделите их все в Проводнике по порядку,
            нажмите F2, введите <code>page</code> и Enter — Windows назовёт их
            <code>page (1).jpg</code>, <code>page (2).jpg</code>... Сайт понимает и такие имена.</li>
        </ol>
        <p class="muted">Помните об авторских правах: чужую мангу можно использовать только для
          локальной учебной демонстрации, не выкладывайте её в открытый доступ.</p>
      </div>
    </div>`;
};
