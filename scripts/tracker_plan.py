"""Чтение плана работ команды из CSV и его проверка.

CSV лежит в docs/superpowers/specs/2026-09-17-obyektiv-work-plan.csv и является
источником правды; Tracker только отображает его. Модуль без сети.

Запуск проверки:  python3 -c "from scripts.tracker_plan import *; print(validate_plan(load_plan(PLAN_CSV)))"
"""
from __future__ import annotations

import csv
from dataclasses import dataclass, field
from pathlib import Path

PLAN_CSV = (Path(__file__).resolve().parent.parent / "docs" / "superpowers"
            / "specs" / "2026-09-17-obyektiv-work-plan.csv")

# приоритет в CSV → ключ приоритета в Tracker
PRIORITY_MAP = {"normal": "normal", "high": "critical", "critical": "blocker"}
UNIQUE_PREFIX = "obj-plan-"


@dataclass
class PlanTask:
    key: str
    component: str
    title: str
    assignee: str
    start: str
    deadline: str
    tags: list[str] = field(default_factory=list)
    blocks: str | None = None
    priority: str = "normal"
    done_criterion: str = ""


def load_plan(path: Path = PLAN_CSV) -> list[PlanTask]:
    """Читает CSV в список задач. Пустой tag → без тегов, пустой blocks → None."""
    tasks: list[PlanTask] = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            tag = (row.get("tag") or "").strip()
            blocks = (row.get("blocks") or "").strip() or None
            tasks.append(PlanTask(
                key=row["key"].strip(),
                component=row["component"].strip(),
                title=row["title"].strip(),
                assignee=row["assignee"].strip(),
                start=row["start"].strip(),
                deadline=row["deadline"].strip(),
                tags=[tag] if tag else [],
                blocks=blocks,
                priority=row["priority"].strip(),
                done_criterion=(row.get("done_criterion") or "").strip(),
            ))
    return tasks


def validate_plan(tasks: list[PlanTask]) -> list[str]:
    """Возвращает список ошибок; пустой список означает, что план согласован."""
    errors: list[str] = []
    seen: set[str] = set()
    keys = {t.key for t in tasks}
    for t in tasks:
        if t.key in seen:
            errors.append(f"{t.key}: ключ повторяется")
        seen.add(t.key)
        if t.blocks and t.blocks not in keys:
            errors.append(f"{t.key}: связь с несуществующей вехой {t.blocks}")
        if t.start > t.deadline:
            errors.append(f"{t.key}: дата начала позже дедлайна")
        if t.priority not in PRIORITY_MAP:
            errors.append(f"{t.key}: неизвестный приоритет {t.priority}")
        if not t.assignee:
            errors.append(f"{t.key}: нет исполнителя")
    return errors


def tracker_priority(priority: str) -> str:
    """Приоритет CSV → ключ приоритета Tracker (normal / critical / blocker)."""
    if priority not in PRIORITY_MAP:
        raise ValueError(f"неизвестный приоритет: {priority}")
    return PRIORITY_MAP[priority]


def unique_id(key: str) -> str:
    """Значение поля unique в Tracker: по нему скрипт находит свою задачу при повторе."""
    return UNIQUE_PREFIX + key


def description_for(task: PlanTask) -> str:
    """Описание задачи в Tracker: критерий готовности и ключ из плана."""
    lines = [f"**Критерий готовности:** {task.done_criterion}", ""]
    if task.blocks:
        lines.append(f"Блокирует веху {task.blocks}.")
        lines.append("")
    lines.append(f"Ключ в плане: {task.key}. Источник: docs/superpowers/specs/2026-09-17-obyektiv-work-plan.csv")
    return "\n".join(lines)
