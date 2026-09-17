"""Заливка плана работ из CSV в Yandex Tracker.

Читает docs/superpowers/specs/2026-09-17-obyektiv-work-plan.csv, создаёт очередь OBJ,
компоненты-потоки, задачи и связи «веха зависит от задачи». Повторный запуск
обновляет свои задачи (по полю unique), чужие не трогает, лишние печатает.

Запуск:  TRACKER_TOKEN=... TRACKER_ORG_ID=... python3 scripts/tracker_fill.py --dry-run
         TRACKER_TOKEN=... TRACKER_ORG_ID=... python3 scripts/tracker_fill.py --apply
         TRACKER_TOKEN=... TRACKER_ORG_ID=... python3 scripts/tracker_fill.py --check
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Callable

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # запуск как python3 scripts/tracker_fill.py

from scripts.tracker_plan import (PLAN_CSV, PlanTask, UNIQUE_PREFIX, description_for,
                                  load_plan, tracker_priority, unique_id, validate_plan)

QUEUE_KEY = "OBJ"
QUEUE_NAME = "Объектив"
USERS_JSON = Path(__file__).resolve().parent / "tracker_users.json"
COMPONENT_ORDER = ["ML", "Бэкенд", "Фронт", "БА и данные", "Презентация", "Лид"]


def load_users(path: Path = USERS_JSON) -> dict[str, str]:
    """«Имя из CSV» → логин в Tracker. Пустой логин допустим."""
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def issue_fields(task: PlanTask, users: dict[str, str], components: dict[str, int]) -> dict:
    """Поля задачи Tracker для создания; для обновления вызывающий убирает queue и unique."""
    login = users[task.assignee]  # KeyError = имя не описано в tracker_users.json
    fields = {
        "queue": QUEUE_KEY,
        "summary": f"{task.key} · {task.title}",
        "description": description_for(task),
        "priority": tracker_priority(task.priority),
        "start": task.start,
        "deadline": task.deadline,
        "components": [components[task.component]],
        "tags": task.tags,
        "unique": unique_id(task.key),
    }
    if login:
        fields["assignee"] = login
    return fields


def plan_actions(tasks: list[PlanTask], existing: list[dict]):
    """Делит план на: создать, обновить (ключ Tracker, задача), лишние наши задачи в очереди."""
    ours = {i["unique"]: i for i in existing if str(i.get("unique") or "").startswith(UNIQUE_PREFIX)}
    create, update = [], []
    for t in tasks:
        found = ours.pop(unique_id(t.key), None)
        if found:
            update.append((found["key"], t))
        else:
            create.append(t)
    extra = list(ours.values())
    return create, update, extra


def _ensure_queue(client, apply: bool, log: Callable) -> None:
    if client.get_queue(QUEUE_KEY):
        return
    lead = client.myself()["login"]
    log(f"очередь {QUEUE_KEY} отсутствует → создать (владелец {lead})")
    if apply:
        client.create_queue(QUEUE_KEY, QUEUE_NAME, lead)


def _ensure_components(client, tasks: list[PlanTask], apply: bool, log: Callable) -> dict[str, int]:
    have = {c["name"]: c["id"] for c in client.list_components(QUEUE_KEY)}
    needed = [n for n in COMPONENT_ORDER if n in {t.component for t in tasks}]
    for name in needed:
        if name in have:
            continue
        log(f"компонент «{name}» отсутствует → создать")
        if apply:
            have[name] = client.create_component(QUEUE_KEY, name)["id"]
        else:
            have[name] = -1  # заглушка для сухого прогона
    return have


def _has_dependency(client, milestone_key: str, task_key: str) -> bool:
    for link in client.list_links(milestone_key):
        if link.get("type", {}).get("id") == "depends" and link.get("object", {}).get("key") == task_key:
            return True
    return False


def sync(client, tasks: list[PlanTask], users: dict[str, str], queue: str = QUEUE_KEY,
         apply: bool = False, log: Callable = print) -> dict:
    """Сводит план с очередью. apply=False только печатает, что сделал бы."""
    report = {"created": [], "updated": [], "linked": [], "skipped_links": [], "extra": [], "key_map": {}}
    _ensure_queue(client, apply, log)
    components = _ensure_components(client, tasks, apply, log)
    existing = client.search_issues(queue) if client.get_queue(queue) else []
    create, update, extra = plan_actions(tasks, existing)

    for t in create:
        fields = issue_fields(t, users, components)
        log(f"создать {t.key}: {t.title} → {t.assignee}, {t.start}..{t.deadline}")
        if apply:
            report["key_map"][t.key] = client.create_issue(fields)["key"]
        report["created"].append(t.key)

    for key, t in update:
        fields = issue_fields(t, users, components)
        fields.pop("queue")
        fields.pop("unique")
        log(f"обновить {key} ← {t.key}: {t.title}")
        if apply:
            client.update_issue(key, fields)
        report["key_map"][t.key] = key
        report["updated"].append(t.key)

    for t in tasks:
        if not t.blocks:
            continue
        m_key, t_key = report["key_map"].get(t.blocks), report["key_map"].get(t.key)
        if not apply or not m_key or not t_key:
            log(f"связь: {t.key} блокирует {t.blocks}")
            continue
        if _has_dependency(client, m_key, t_key):
            report["skipped_links"].append((t.key, t.blocks))
            continue
        client.add_dependency(m_key, t_key)
        report["linked"].append((t.key, t.blocks))

    for e in extra:
        log(f"в очереди есть наша задача {e['key']} ({e.get('unique')}), которой нет в CSV: не трогаю")
        report["extra"].append(e["key"])
    return report


def check(client, tasks: list[PlanTask], queue: str = QUEUE_KEY) -> list[str]:
    """Проверка по спеке, раздел 8. Возвращает список проблем; пустой список = всё сходится."""
    problems: list[str] = []
    existing = client.search_issues(queue)
    ours = {i["unique"]: i for i in existing if str(i.get("unique") or "").startswith(UNIQUE_PREFIX)}
    if len(ours) != len(tasks):
        problems.append(f"в очереди {len(ours)} наших задач, в CSV {len(tasks)}")
    key_map: dict[str, str] = {}
    for t in tasks:
        issue = ours.get(unique_id(t.key))
        if not issue:
            problems.append(f"{t.key}: нет в очереди")
            continue
        key_map[t.key] = issue["key"]
        label = f"{issue['key']} ({t.key})"
        if not issue.get("assignee"):
            problems.append(f"{label}: нет исполнителя")
        if not issue.get("start"):
            problems.append(f"{label}: нет даты начала")
        if not issue.get("deadline"):
            problems.append(f"{label}: нет дедлайна")
        if not issue.get("components"):
            problems.append(f"{label}: нет компонента")
    for t in tasks:
        if t.blocks and t.blocks in key_map and t.key in key_map:
            if not _has_dependency(client, key_map[t.blocks], key_map[t.key]):
                problems.append(f"веха {t.blocks}: нет связи от {t.key}")
    return problems


def main(argv: list[str] | None = None) -> int:
    from scripts.tracker_client import client_from_env

    parser = argparse.ArgumentParser(description="Заливка плана работ Объектива в Yandex Tracker")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="только напечатать, что будет сделано")
    mode.add_argument("--apply", action="store_true", help="создать и обновить задачи")
    mode.add_argument("--check", action="store_true", help="сверить очередь с CSV")
    parser.add_argument("--plan", default=str(PLAN_CSV), help="путь к CSV плана")
    parser.add_argument("--users", default=str(USERS_JSON), help="путь к JSON имя → логин")
    args = parser.parse_args(argv)

    plan_path = Path(args.plan)
    if not plan_path.exists():
        sys.exit(f"нет файла плана: {plan_path}")
    tasks = load_plan(plan_path)
    errors = validate_plan(tasks)
    if errors:
        sys.exit("план не согласован:\n  " + "\n  ".join(errors))
    users = load_users(Path(args.users))
    missing = sorted({t.assignee for t in tasks} - set(users))
    if missing:
        sys.exit("в tracker_users.json нет имён: " + ", ".join(missing))

    client = client_from_env()
    print(f"вход как {client.myself()['login']}")

    if args.check:
        problems = check(client, tasks)
        print("\n".join(problems) if problems else "очередь сходится с CSV: задачи, поля, связи вех")
        return 1 if problems else 0

    report = sync(client, tasks, users, apply=args.apply)
    print(f"\nсоздать: {len(report['created'])}, обновить: {len(report['updated'])}, "
          f"связей добавлено: {len(report['linked'])}, уже были: {len(report['skipped_links'])}, "
          f"лишних в очереди: {len(report['extra'])}")
    if not args.apply:
        print("это сухой прогон, в Tracker ничего не изменилось; запусти с --apply")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
