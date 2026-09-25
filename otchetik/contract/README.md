# Контракт «Отчётика» (приложение прораба)

Пути по документу `docs/FOREMAN_APP.md` §13 (репозиторий construction-monitoring), плюс `objects` для экрана входа.
Примеры ответов: `otchetik/demo/*.json`. Схемы: `otchetik/contract/schemas.ts`.

| Запрос | Ответ (пример) |
|---|---|
| `GET /api/foreman/objects` | `demo/objects.json` |
| `GET /api/foreman/object/{object_id}/schedule?brigade_id=&date=YYYY-MM-DD` | `demo/schedule.json` |
| `POST /api/foreman/shots` multipart: `photo` (jpeg), `local_uuid`, `task_id`, `taken_at` (ISO 8601), `geo` («lat,lon» или пусто), `retake_of` (необязательно) | `201 {"server_id": "...", "status": "uploaded"}` |
| `GET /api/foreman/shots/status?uuids=a,b,c` | `demo/shots-status.json` |
| `GET /api/foreman/leaderboard?object_id=` | `demo/leaderboard.json` |

Правила:
- Повтор `POST` с тем же `local_uuid` не создаёт дубль и отвечает тем же `server_id`.
- `retake_of` — `local_uuid` фото «на доработку», которое переснимает это фото (кнопка «Переснять» на экране «Отчёты»); передаётся, только когда это пересъём.
- Статусы фото: `uploaded, processing, processed, under_review, accepted, partial, rework, rejected` (до `uploaded` живёт на телефоне).
- `verdict` — исход проверки руководителем, дублирует `status` для accepted/partial/rework/rejected; необязателен.
- `verdict_comment` для `rework` и `rejected`: текст руководителя, показывается прорабу.
- На экранах приложения статусы сворачиваются в три слова: `rework`/`rejected` → «переснять», остальное → «в работе», без фото → «не начато». Дополнительно «переснять» ставится, если `GET /photos` (маршрут сервера вне этого контракта) вернул для фото пустой `detections`.
- Даты и время в ISO 8601 с часовым поясом.
- CORS: веб-версия ходит с `https://jas76123.github.io`, нужен `Access-Control-Allow-Origin`.
