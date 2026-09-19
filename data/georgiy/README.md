Выход модели Георгия из общего репозитория `cd-rec/construction-monitoring` (SourceCraft), снято 19.09.2026.

- `video_detections.json` — записи `{frame, time_sec, id, class, confidence, bbox}`; `bbox` = `[cx, cy, w, h]` от центра рамки, пиксели.
- `Video.mp4` — ролик 720×1280, 30 кадр/с; в git не хранится, взять из общего репозитория.

Пересборка наблюдений для фронта: `cd frontend && npm run real`.
