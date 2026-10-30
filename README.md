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
/claude реализуй задачу из issue #12
```

Ответ появится комментарием от имени приложения. Прогресс — во вкладке **Actions**.

### Ручной вызов (`/claude`)

Напишите комментарий к issue или PR — агент ответит и выполнит задачу.

| Параметр | Значение |
|---|---|
| Событие | `issue_comment`, `pull_request_review_comment` |
| Команды | `/claude` |
| Доступ | Owner, Member, Collaborator |
| Модель | `claude-sonnet-4-6` (Anthropic) |
| Сессии | Не публикуются (`share: false`) |

### Авто-триаж новых обращений

При открытии нового issue агент автоматически разбирает обращение по скиллу `triage`:
проверяет кодовую базу, предлагает категорию и следующий шаг, задаёт уточняющие вопросы.

| Параметр | Значение |
|---|---|
| Событие | `issues: opened` |
| Фильтр авторов | Owner, Member, Collaborator (внешние PR-авторы пропускаются) |
| Фильтр меток | Issues с меткой `ready-for-agent` пропускаются (это тикеты, созданные `to-tickets`) |
| Timeout | 15 минут |
| Параллельность | Один запуск на issue, повторный пуш не отменяет текущий |

### Авторевью pull request

Воркфлоу `.github/workflows/auto-review.yml` запускает независимого ревьюера при открытии
или обновлении PR. Ревьюер читает спецификацию и согласование по ссылкам в описании PR,
проверяет diff и CI, затем оставляет замечания по критериям из `REVIEW.md`.

| Параметр | Значение |
|---|---|
| Событие | `pull_request: opened, synchronize, reopened` |
| Фильтр веток | Только PR из того же репозитория (fork не получают секрет модели) |
| Авторы | Любые (включая ботов — иначе PR от `implement-spec` не получит ревью) |
| Timeout | 15 минут |
| Параллельность | Один запуск на PR, новый push **отменяет** устаревшее ревью |
| Права | `contents: read`, `issues: read`, `actions: read`, `checks: read`, `statuses: read`, `pull-requests: write` |
| Критерии | Явно передаются из `REVIEW.md` в промпт воркфлоу |

Ревьюер **не меняет код** и не вызывает `gh pr review --approve`. Замечания публикуются
sticky-комментарием. Человек разбирает каждое замечание и при необходимости передаёт его
автору командой `/claude`.

### Бюджет запусков на PR

Воркфлоу `claude.yml` ограничивает число запусков агента на один PR до **3**.
Счётчик ведётся по истории Actions (источник, недоступный для записи через токен агента).

При исчерпании бюджета шаг публикует комментарий с причиной `limit_exhausted`,
текущим SHA и ссылкой на лог — и завершается без вызова модели.

Новый PR получает новый бюджет. Администратор может изменить настройки воркфлоу.

### Lighthouse-аудит по расписанию

Воркфлоу `.github/workflows/lighthouse-audit.yml` запускает ежедневный аудит
производительности приложения и поручает агенту разобрать отчёт и создать задачи.

| Параметр | Значение |
|---|---|
| Событие | `schedule` (06:17 МСК = 03:17 UTC) + `workflow_dispatch` |
| Timeout | 30 минут |
| Параллельность | Один активный аудит, новый запуск ждёт завершения предыдущего |
| Права | `contents: read`, `issues: write`, `id-token: write`, `actions: read` |
| URL приложения | Переменная `APP_URL` (Render, fallback вшит в воркфлоу) |
| Артефакт | `lighthouse-report-<run_id>` — JSON-отчёт и краткий дайджест, 30 дней |

**Как работает:**

1. Шаг `Run Lighthouse audit` запускает `npx lighthouse@12` в headless Chrome и сохраняет
   полный JSON (`lh-report.json`) и компактный дайджест (`lh-summary.json`).
2. Оба файла загружаются артефактом — так результат доступен даже когда ссылка на артефакт истечёт в трекере.
3. Агент (`claude-code-action`) читает `lh-summary.json`, ищет уже открытые issues с меткой
   `lighthouse` и создаёт новую задачу только по **новой** находке (score < 90).
4. При повторном запуске с той же находкой агент находит дубликат и пропускает создание.

**Учебный режим** (`demo_mode: true` в `workflow_dispatch`):
запускается без реального аудита, агент получает заготовленный отчёт с явно обозначенной
«учебной находкой» — используется для демонстрации создания issue без выдумывания дефектов.

**Результаты запусков:**

- [Прогон с учебным отчётом (demo_mode)](https://github.com/IlyaKruger/ai-for-developers-project-387/actions/runs/41019239234) — артефакт `lh-summary.json` во вкладке Summary
- [Issue #21 — учебная находка, созданная агентом](https://github.com/IlyaKruger/ai-for-developers-project-387/issues/21)
- Все issues с меткой [`lighthouse`](https://github.com/IlyaKruger/ai-for-developers-project-387/issues?q=label%3Alighthouse)

---

## Самооценка

### Функциональность

Код из предыдущего проекта перенесён без изменений. Dockerfile собирает
3-stage production-образ (frontend → backend → scratch), приложение стартует и слушает
`PORT` из окружения. Ссылка на деплой и команды локального запуска есть в README.

### Проверяемость

CI на `main` зелёный: lint, typecheck, unit-тесты, Playwright e2e, generate-check.
Все коммиты в Conventional Commits, release-please поддерживает PR v1.1.0.
Ключ провайдера хранится в GitHub Secrets (`CLAUDE_CODE_OAUTH_TOKEN`), в файлах
репозитория его нет. Лимит в 3 запуска на PR проверяется до вызова модели через
GitHub Actions API.

### Настройка агентной разработки

Подключён **Claude GitHub App** (не opencode). Интерактивный воркфлоу реагирует
на `issue_comment` и `pull_request_review_comment` с `types: [created]`, команда `/claude`.
Авто-триаж работает на `issues: opened`, авторевью — на `pull_request`.
Lighthouse-аудит по расписанию (раз в сутки, 06:17 МСК) плюс `workflow_dispatch`.
Все воркфлоу с агентом имеют `timeout-minutes` и `concurrency`. Fork не получают секреты.

### Следы работы

Агент отвечал в issues (#4, #18, #19), открывал PR (#20), оставлял ревью-комментарии.
Lighthouse-агент автоматически создал issue #21 по находке. Повторный запуск не создаёт
дубли (проверка через `gh issue list`). Отчёты сохраняются как артефакты, в коммиты не
попадают.

---

### Личные выводы и трудности

**Токен для Claude GitHub App.** Наибольшие трудности вызвала настройка аутентификации.
`claude-code-action@v1` требует `CLAUDE_CODE_OAUTH_TOKEN` — OAuth-токен, который нельзя
создать вручную через UI: нужно пройти авторизацию через самого Claude (`claude setup-token`
или авторизационный flow в браузере). Это не очевидно из документации, я потратил
время на поиск правильного способа получения токена и добавление его в GitHub Secrets.

**Права воркфлоу.** `id-token: write` нужен для OIDC-аутентификации action — без него
воркфлоу падает с неочевидной ошибкой. `issues: write` и `pull-requests: write` нужны
отдельно: их отсутствие не мешает запуску агента, но он молча не может создать комментарий.

**Prompt-инжиниринг для Lighthouse-агента.** Сложно сформулировать промпт так, чтобы
агент не создавал дубли и не выдумывал находки. В первом варианте он создавал отдельный
issue на каждую метрику (LCP, TTFB, Performance) вместо одного сводного — пришлось явно
написать «обрабатывай только category-level findings» и добавить проверку существующих
issues через `gh issue list` перед созданием.

**Render Free засыпает.** Lighthouse-аудит реального продакшна нестабилен: Render Free
спит через 15 минут неактивности, и аудит иногда получает пустой отчёт. Решение —
`demo_mode: true` для учебных запусков и предварительный прогрев через `curl`.

**Concurrency и cancel-in-progress.** Для авторевью нужно `cancel-in-progress: true`
(новый пуш отменяет старое ревью), для интерактивного агента — `false` (иначе второй
комментарий отменяет первый ещё не дочитав запрос). Это требует отдельной настройки
в каждом воркфлоу, а не глобального дефолта.

### Шаблон pull request

`.github/pull_request_template.md` задаёт разделы **Checks**, **Risk assessment** и
**Rollback**. Агент заполняет их при открытии PR. Глубина проверки обосновывается
последствиями ошибки, а не числом изменённых строк.

### Скиллы

На раннере доступны те же скиллы, что и локально: `triage`, `to-spec`, `to-tickets`,
`implement-spec`, `code-review` и другие из `.agents/skills/`.

### Настройка (один раз)

1. Установите **Claude GitHub App** на репозиторий.
2. Убедитесь, что воркфлоу слит в `main`.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>
