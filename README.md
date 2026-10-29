# Календарь звонков

[![CI](https://github.com/IlyaKruger/ai-for-developers-project-387/actions/workflows/ci.yml/badge.svg)](https://github.com/IlyaKruger/ai-for-developers-project-387/actions/workflows/ci.yml)
[![hexlet-check](https://github.com/IlyaKruger/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/IlyaKruger/ai-for-developers-project-387/actions)

Сервис бронирования звонков: хост публикует доступные слоты, гость бронирует без регистрации.

Учебный проект [Хекслета](https://ru.hexlet.io/programs/ai-for-developers).

Продолжение проекта [ai-for-developers-project-386](https://github.com/IlyaKruger/ai-for-developers-project-386) — спецификация и решения первого шага живут там.

## Демо

**Приложение:** https://ai-for-developers-project-386-6d42.onrender.com

> Приложение задеплоено в рамках предыдущего проекта (project-386) и доступно по тому же адресу.

## Стек

- **Бэкенд:** Node.js, [Hono](https://hono.dev/), TypeScript
- **Фронтенд:** React, Vite, TypeScript, Tailwind CSS
- **Контракт API:** [TypeSpec](https://typespec.io/) → OpenAPI → [@hey-api/openapi-ts](https://heyapi.dev/)
- **Тесты:** Vitest (unit + integration), Playwright (e2e)

## Запуск локально

### Требования

- Node.js 18+
- npm 9+

### Установка

```bash
git clone https://github.com/IlyaKruger/ai-for-developers-project-387.git
cd ai-for-developers-project-387
npm run install:all
```

### Запуск

В двух отдельных терминалах:

```bash
# Бэкенд (http://localhost:3001)
npm run dev:backend

# Фронтенд (http://localhost:5173)
npm run dev:frontend
```

> **Данные хранятся в памяти** — никакой базы данных нет. При каждом перезапуске бэкенда все бронирования сбрасываются и слоты генерируются заново для окна «следующие 14 дней».

### Переменные окружения (опционально)

| Переменная | По умолчанию | Описание |
|---|---|---|
| `BOOKING_TZ` | `Europe/Moscow` | IANA-часовой пояс генерации слотов |
| `BOOKING_WINDOW_DAYS` | `14` | Размер окна доступных слотов (в днях) |
| `BOOKING_WINDOW_START` | `1` | Минимальный аванс: за сколько дней от сегодня открывается окно |
| `BOOKING_STEP_MINUTES` | `60` | Шаг между слотами внутри одного рабочего часа. `30` — два слота в час при подходящей длительности типа встречи |
| `PORT` | `3000` | Порт (только в production-сборке) |

Пример:

```bash
BOOKING_TZ=Europe/Berlin BOOKING_WINDOW_DAYS=7 npm run dev:backend
```

## Проверки

```bash
# Всё сразу: линтер, типы, unit-тесты, e2e
npm run check

# По отдельности
npm run lint        # oxlint (frontend + backend)
npm run typecheck   # tsc (frontend + backend)
npm run test:unit   # vitest
npm run test:e2e    # Playwright (запускает сервера автоматически)
```

## Обновление API-контракта

TypeSpec — единственный источник правды. После изменения `contract/src/main.tsp`:

```bash
npm run generate    # TypeSpec → openapi.yaml → frontend/src/generated/
```

Зафиксируйте `.tsp`, `openapi.yaml` и `frontend/src/generated/` в одном коммите. CI проверяет актуальность: повторяет `generate` и ожидает чистый `git diff`.

> **Не редактируйте `openapi.yaml` и `frontend/src/generated/` вручную** — они перезаписываются при следующем `npm run generate`.

## Деплой на Render через MCP

Приложение задеплоено на [Render](https://render.com/) через [Render MCP Server](https://github.com/render-oss/mcp-server-render) — MCP-инструмент, который Claude вызывает напрямую для деплоя, просмотра логов и управления сервисом.

### Подключение MCP-агента к Render

1. Получите API-ключ Render: **Dashboard → Account → API Keys**.

2. Скопируйте шаблон конфига:

   ```bash
   cp .claude/settings.template.json ~/.claude/settings.json
   ```

   Или добавьте блок `mcpServers.render` в существующий `~/.claude/settings.json`.

3. Вставьте ключ:

   ```json
   {
     "mcpServers": {
       "render": {
         "type": "stdio",
         "command": "npx",
         "args": ["-y", "@render-oss/mcp-server-render"],
         "env": {
           "RENDER_API_KEY": "rnd_xxxxxxxxxxxxxxxx"
         }
       }
     }
   }
   ```

4. Перезапустите Claude Code. Инструменты `mcp__render__*` станут доступны агенту.

> `~/.claude/settings.json` — глобальный файл вне репозитория. Шаблон без секретов лежит в `.claude/settings.template.json` (в `.gitignore` исключение прописано).

### Как деплой проходит в CI/CD

CI не деплоит автоматически. Render настроен на **Auto-Deploy**: при пуше в `main` Render сам пересобирает Docker-образ и выкатывает его. Для ручного деплоя через MCP:

```
# В чате Claude Code:
задеплой сервис на Render
```

Агент вызовет `mcp__render__trigger_deploy` с нужным `serviceId`.

## Архитектура

```
contract/src/main.tsp   ← TypeSpec (источник правды)
       ↓  npm run generate:openapi
openapi.yaml
       ↓  npm run generate:client
frontend/src/generated/ ← клиентский SDK (не редактировать)

backend/src/
  index.ts       — точка входа, создаёт Hono-приложение
  app.ts         — маршруты HTTP API
  db.ts          — in-memory хранилище, начальные данные
  slot-config.ts — SlotConfig из env vars
  slot-generator.ts — generateSlots(): динамическое скользящее окно
  overlap.ts     — функция проверки пересечения временных окон
```

## Агент в GitHub Actions

Воркфлоу `.github/workflows/claude.yml` запускает Claude Code внутри GitHub Actions
в ответ на команды в комментариях к issue и pull request.

### Как использовать

Напишите команду в комментарии к любому issue или PR:

```
/claude запусти скилл to-spec по обсуждению этого issue
/cc реализуй задачу из issue #12
```

Ответ появится комментарием от имени приложения. Прогресс — во вкладке **Actions**.

### Событие и условия

| Параметр | Значение |
|---|---|
| Событие | `issue_comment`, `pull_request_review_comment` |
| Команды | `/claude`, `/cc` |
| Доступ | Owner, Member, Collaborator |
| Модель | `claude-sonnet-4-6` (Anthropic) |
| Сессии | Не публикуются (`share: false`) |

### Скиллы

На раннере доступны те же скиллы, что и локально: `to-spec`, `to-tickets`,
`implement-spec`, `code-review` и другие из `.agents/skills/`.

### Настройка (один раз)

1. Установите **Claude GitHub App** на репозиторий.
2. Добавьте ключ модели: **Settings → Secrets and variables → Actions → New repository secret**
   с именем `ANTHROPIC_API_KEY`.
3. Убедитесь, что воркфлоу слит в `main`.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>
