# Контракт «Отчётика» (приложение прораба)

Пути по документу `docs/FOREMAN_APP.md` §13 (репозиторий construction-monitoring), плюс `objects` для экрана входа.
Примеры ответов: `otchetik/demo/*.json`. Схемы: `otchetik/contract/schemas.ts`.

| Запрос | Ответ (пример) |
|---|---|
| `GET /api/foreman/objects` | `demo/objects.json` |
| `GET /api/foreman/object/{object_id}/schedule?brigade_id=&date=YYYY-MM-DD` | `demo/schedule.json` |
| `POST /api/foreman/shots` multipart: `photo` (jpeg), `local_uuid`, `task_id`, `work_name` (название работы, как в наряде), `zone`, `taken_at` (ISO 8601), `geo` («lat,lon» или пусто), `retake_of` (необязательно) | `201 {"server_id": "...", "status": "uploaded"}` |
| `GET /api/foreman/shots/status?uuids=a,b,c` | `demo/shots-status.json` |
| `GET /api/foreman/leaderboard?object_id=` | `demo/leaderboard.json` |

Правила:
- Повтор `POST` с тем же `local_uuid` не создаёт дубль и отвечает тем же `server_id`.
- `retake_of` — `local_uuid` фото «на доработку», которое переснимает это фото (кнопка «Переснять» на экране «Отчёты»); передаётся, только когда это пересъём.
- Статусы фото: `uploaded, processing, processed, under_review, accepted, partial, rework, rejected` (до `uploaded` живёт на телефоне).
- `verdict` — исход проверки руководителем, дублирует `status` для accepted/partial/rework/rejected; необязателен.
- `verdict_comment` для `rework` и `rejected`: текст руководителя, показывается прорабу.
- `GET /photos` (маршрут сервера вне этого контракта, опрос раз в 20 с): у каждого фото `works_status: [{ work, status, found }]` — сверка с планом. `status`: `confirmed` (нашлась ожидаемая техника), `not_confirmed` (детекции есть, но не те; принимается и `not confirmed`), `review` (детекций нет), `unsure` (работа не нашлась в таблице плана). Работу сервер берёт из поля `work_name`.
- Слова у фото на экранах: `confirmed` → «принято»; `review`, `not_confirmed` → «переснять»; `unsure` или сверки нет → старое правило: пустой `detections` → «переснять», иначе слово доставки «отправлено». `rework`/`rejected` из `shots/status` → «переснять», `accepted`/`partial` → «в работе» — главнее сверки.
- Чип работы за сегодня: без фото «не начато», свежее фото «переснять» → «переснять», иначе «в работе». За прошедший день итог ставит приложение: «принято», если есть хотя бы одно фото не «переснять», иначе «не принято».
- Рейтинг на телефоне: «принято» у бригады = фото с `confirmed`; если сверки в ответе нет или она `unsure` — фото с непустым `detections`. Поле `found` приложение не читает.
- Даты и время в ISO 8601 с часовым поясом.
- CORS: веб-версия ходит с `https://jas76123.github.io`, нужен `Access-Control-Allow-Origin`.
