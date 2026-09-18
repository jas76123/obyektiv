# Контракт данных «Объектива»: фронт ↔ бэкенд

Источник правды по формату — схемы zod в этой папке. Образцы ответов — `frontend/public/data/` (собираются `npm run data`). Пути совпадают с `DEV_REQUIREMENTS.md` §6.

| Путь | Схема | Образец |
|---|---|---|
| `GET /api/portfolio` | `PortfolioSchema` | `public/data/portfolio.json` |
| `GET /api/objects/{id}/gantt` | `ObjectGanttSchema` | `public/data/gantt/<key>.json` |
| `GET /api/works/{id}/review` | `WorkReviewSchema` | `public/data/review/<key>.json` |
| `GET /api/cameras/{id}/frame?date=YYYY-MM-DD` | `CameraShiftSchema` | `public/data/frame/<key>_<date>.json` |
| `GET /api/settings?object={id}` | `SettingsSchema` | `public/data/settings/<key>.json` |
| `POST /api/plan` | тело `PlanUploadSchema`, ответ `PlanUploadResultSchema` | — |

`<key>` — id, в котором каждый символ вне `[A-Za-z0-9_-]` заменён на `u` + hex-код (`lib/fileKey.ts`). Бэкенду это не нужно: он получает id как есть.

## Правила

1. В каждом ответе `as_of` — дата среза `YYYY-MM-DD`.
2. Три оси раздельно (BR-401): `status` — чип наблюдения; `tags[]` — метки отчётности (`rep`, `lag`), сроков (`sched`), исхода (`manual`) с готовым текстом; `severity` — число для сортировки, больше = острее.
3. Статусы: `in_progress, resources_only, nothing_detected, insufficient, not_checked, not_started, manual_resolved`. Причина `not_checked` в `status_reason`: `no_catalog, no_observable, no_camera, no_frames`. `false_completion` фронт принимает и рисует как `nothing_detected`; метку `rep` бэкенд присылает в `tags`.
4. Уровень дня: `2` работа идёт, `1` только ресурсы, `0` ничего, `null` кадров нет. Выходные и будущие дни в `calendar.days` не передаются. Дни простоя по акту перечислены в `calendar.acts`.
5. «Заявлено»: `declared.percent` обязателен; `report_date`, `author`, `fact_source` (`plan_column | weekly_report | ks2 | manual`, как в `schemas.Work` БА) необязательны.
6. Кадр: `frame_id, camera_id, captured_at` (ISO 8601 с поясом), `image_path` (URL или путь от корня сайта; `null`, если картинки нет), `width`, `height`, `detections[]`.
7. Детекция: `class` (код из таблицы ML-03), `confidence`, `bbox` = `[x, y, w, h]` в пикселях кадра, левый верхний угол и размеры. В `schemas.py` рамка `[x1, y1, x2, y2]`: перевод `w = x2 - x1`, `h = y2 - y1` делает бэкенд. `track_id` необязателен. `off_stage: true` — техника не по этапу.
8. Все тексты (вердикт, причины, подпись кадра, строка прогноза, подпись триады) приходят готовыми строками. Фронт ничего не вычисляет, кроме счётчиков открытых замечаний по состояниям обработки в браузере.
9. Проценты — числа 0–100 без знака `%`.

## Проверка живого API

`NEXT_PUBLIC_API_BASE=http://localhost:8000 npm run check:api` обходит все пути и печатает расхождения со схемами в виде «путь · поле · что ждали».
