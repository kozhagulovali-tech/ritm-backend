# Ритм — backend

Реальный backend для прототипа «Ритм»: пользователи, задачи, встречи и
создание звонков в Google Meet через Composio (Google Calendar).

## Что внутри

```
src/
  server.js              — точка входа Express
  db.js                  — подключение к Postgres
  db/schema.sql           — SQL-схема (выполнить один раз на своей базе)
  composioClient.js       — инициализация Composio SDK
  googleMeet.js           — создание события в Google Calendar с Meet-ссылкой
  middleware/auth.js      — проверка JWT-токена
  routes/
    auth.routes.js        — регистрация и вход
    team.routes.js         — список команды
    tasks.routes.js        — задачи
    events.routes.js       — встречи и звонки
    integrations.routes.js — подключение Google-аккаунта
```

## Шаг 1. Заведите аккаунты и доступы

1. **Postgres** — создайте бесплатную базу в [Supabase](https://supabase.com),
   [Neon](https://neon.tech) или [Railway](https://railway.app) и скопируйте
   строку подключения (`DATABASE_URL`).
2. **Composio** — зарегистрируйтесь на [composio.dev](https://composio.dev),
   получите `COMPOSIO_API_KEY` в личном кабинете.
3. **Google Cloud** — создайте проект в
   [Google Cloud Console](https://console.cloud.google.com), включите Google
   Calendar API, создайте OAuth 2.0 Client ID (тип Web application), получите
   `client_id` и `client_secret`. Пока приложение не верифицировано Google,
   добавьте всех коллег как тестовых пользователей (OAuth consent screen →
   Test users).
4. **Auth Config в Composio** — в дашборде Composio: Auth Configs → New →
   выберите тулкит Google Calendar → вставьте свои `client_id`/`client_secret`
   из шага 3 → сохраните и скопируйте `COMPOSIO_GOOGLE_AUTH_CONFIG_ID`.

## Шаг 2. Настройте переменные окружения

```bash
cp .env.example .env
```

Заполните `.env` значениями из шага 1 (см. комментарии в самом файле).

## Шаг 3. Накатите схему базы данных

```bash
psql "$DATABASE_URL" -f src/db/schema.sql
```

(или выполните содержимое `src/db/schema.sql` через визуальный редактор
SQL вашего провайдера базы — например, в Supabase это SQL Editor).

## Шаг 4. Запуск локально

```bash
npm install
npm run dev
```

Проверка, что сервер жив:

```bash
curl http://localhost:4000/health
```

Регистрация:

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fio":"Иванова Анна","email":"anna@company.com","position":"Менеджер","password":"test1234"}'
```

## Шаг 5. Деплой

Подойдёт любой Node-хостинг — например, [Render](https://render.com) или
[Railway](https://railway.app):

1. Залейте этот код в свой git-репозиторий.
2. Создайте новый Web Service, подключите репозиторий.
3. Build command: `npm install`, Start command: `npm start`.
4. Впишите те же переменные окружения, что и в `.env`, в настройках сервиса.
5. После деплоя у вас будет постоянный HTTPS-адрес — это и есть `FRONTEND_URL`/
   адрес API для дальнейшей настройки фронтенда.

## ⚠️ Перед первым реальным запуском интеграции с Google Meet

В файле `src/googleMeet.js` названия параметров действия
`GOOGLECALENDAR_CREATE_EVENT` (`start_datetime`, `event_duration_minutes`,
`create_meeting_room` и т.д.) указаны по документации Composio на момент
написания кода. Composio периодически обновляет схемы тулкитов — поэтому
перед тем как полагаться на это в проде, откройте в дашборде Composio раздел
**Toolkits → Google Calendar → CREATE_EVENT** и сверьте актуальные имена
полей запроса и ответа. Если что-то отличается, поправить нужно только
объект `arguments` и строки с `result?.data...` в этом файле — остальной
backend трогать не придётся.

## Как это связано с прототипом из чата

React-прототип, который мы собирали в чате (артефакт), работает в
изолированной песочнице браузера и **не может** напрямую обратиться к этому
backend'у — у артефактов нет доступа к произвольным внешним адресам и нет
постоянного домена для OAuth-редиректов.

Чтобы по-настоящему связать фронтенд с этим backend'ом, нужно:

1. Экспортировать код прототипа в обычный проект (Vite/Create React App).
2. Заменить в нём `useState`-моки на `fetch`-запросы к адресам ниже.
3. Задеплоить этот фронтенд отдельно (например, на Vercel или Netlify) и
   указать его адрес в `FRONTEND_URL` на backend'е.

Это отдельный шаг, который можно сделать следующим — дайте знать, когда
будете готовы, и я помогу переписать фронтенд под реальные запросы.

## Список эндпоинтов

| Метод | Путь | Назначение |
|---|---|---|
| POST | `/api/auth/register` | Регистрация (ФИО, почта, должность, пароль) |
| POST | `/api/auth/login` | Вход |
| GET | `/api/auth/me` | Данные текущего пользователя по токену (для восстановления сессии) |
| GET | `/api/team` | Список команды |
| GET | `/api/tasks` | Список задач |
| POST | `/api/tasks` | Создать задачу |
| PATCH | `/api/tasks/:id/status` | Изменить статус задачи |
| GET | `/api/events` | Список встреч/звонков |
| POST | `/api/events` | Создать встречу (с `useGoogleMeet: true` — автоссылка через Composio) |
| DELETE | `/api/events/:id` | Удалить встречу |
| POST | `/api/integrations/google/connect` | Начать подключение Google-аккаунта |
| GET | `/api/integrations/google/status` | Проверить статус подключения |

Все эндпоинты кроме `/api/auth/*` и `/health` требуют заголовок
`Authorization: Bearer <token>`, полученный при регистрации/входе.
