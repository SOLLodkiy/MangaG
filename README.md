# MangaG

**Платформа для художников комиксов и манги**: постраничный просмотр, система глав,
донаты автору. Ориентир по функционалу — [mangalib.me](https://mangalib.me/).

Курсовой проект. Автор: **Солодкий Максим**, группа **3ПО-9**.

> Проект в разработке. План и текущий прогресс — в [CLAUDE.md](CLAUDE.md).

## Возможности

- Каталог тайтлов с поиском, фильтрами по жанрам, типу и статусу
- Система глав: тома, главы, страницы, черновики и публикация
- Читалка: постраничный режим и лента, управление клавишами и свайпами,
  сохранение прогресса чтения
- Донаты автору (учебный платёжный шлюз), история донатов, баланс автора
- Закладки, оценки, комментарии, лайки
- Кабинет автора для загрузки глав и админ-панель

## Стек

| Часть    | Технологии                                                          |
| -------- | ------------------------------------------------------------------- |
| Backend  | Node.js, Express 5, Prisma 6, SQLite, zod, JWT, multer, sharp       |
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query |
| Тесты    | Jest, Supertest, Vitest                                             |

## Запуск

Нужен Node.js 20 или новее.

```bash
npm install
cp server/.env.example server/.env
npm run db:migrate -w server
npm run db:seed -w server
npm run dev
```

API будет доступен на <http://localhost:4000/api>
(проверка: <http://localhost:4000/api/health>).

## Демо-аккаунты

После `db:seed` (пароль у всех `password123`):

- `admin@mangag.local` — администратор
- `author@mangag.local`, `author2@mangag.local` — авторы
- `reader@mangag.local` — читатель

## Команды

| Команда                        | Что делает                        |
| ------------------------------ | --------------------------------- |
| `npm run dev`                  | запуск в режиме разработки        |
| `npm test`                     | тесты сервера                     |
| `npm run lint`                 | проверка кода ESLint              |
| `npm run format`               | форматирование Prettier           |
| `npm run db:migrate -w server` | применить/создать миграции Prisma |
| `npm run db:seed -w server`    | заполнить базу демо-данными       |
| `npm run db:studio -w server`  | просмотр базы в Prisma Studio     |

## Структура

```
MangaG/
├── server/   # REST API (Express + Prisma)
├── client/   # веб-клиент (React) — этап 5
└── docs/     # документация к курсовой
```
