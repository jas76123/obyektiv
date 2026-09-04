"""Сгенерировать демонстрационные детекции и проверить ожидаемые статусы.

Кадры синтетические: это заглушка, чтобы бэкенд разрабатывал сверку,
не дожидаясь готовой модели. Формат совпадает с контрактом детектора.

Запуск:  python scripts/make_demo_detections.py
"""
from __future__ import annotations

import csv
import json
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

MSK = timezone(timedelta(hours=3))
DEMO = Path(__file__).resolve().parent.parent / "data" / "demo"
FRAME_W = 1920
HOURS = list(range(8, 19))          # кадр каждый час, 08:00–18:00
TODAY = date(2026, 9, 4)
START = date(2026, 8, 18)

# ---------------------------------------------------------------- сценарии
# (зона, дата-с, дата-по): что происходит в кадре
MOVING = "moving"     # техника меняет положение в течение смены
STATIC = "static"     # техника на месте, но не двигается
EMPTY = "empty"       # в зоне пусто

SCENARIOS = [
    # Секция 1
    ("Секция 1", "2026-08-18", "2026-08-21", MOVING, ["excavator", "dump_truck"], 3),
    ("Секция 1", "2026-08-24", "2026-08-26", MOVING, ["excavator", "dump_truck"], 2),
    ("Секция 1", "2026-08-27", "2026-08-27", STATIC, ["excavator", "dump_truck"], 1),
    ("Секция 1", "2026-08-28", "2026-09-04", MOVING, ["excavator", "dump_truck"], 2),
    # Секция 2
    ("Секция 2", "2026-08-19", "2026-08-26", MOVING, ["excavator", "dump_truck"], 2),
    ("Секция 2", "2026-08-27", "2026-08-27", MOVING, ["dump_truck", "excavator"], 2),
    ("Секция 2", "2026-08-28", "2026-09-03", EMPTY, [], 0),
    ("Секция 2", "2026-09-04", "2026-09-04", STATIC, ["concrete_pump"], 2),
]

BOX = {
    "excavator": (340, 500, 400),
    "dump_truck": (430, 440, 290),
    "concrete_pump": (390, 460, 360),
    "crane": (120, 380, 640),
    "mixer_truck": (430, 430, 300),
}
CONF = {"excavator": .93, "dump_truck": .87, "concrete_pump": .86,
        "crane": .84, "mixer_truck": .85, "person": .78}


def working_days(start: date, end: date) -> list[date]:
    days, cur = [], start
    while cur <= end:
        if cur.weekday() < 5:
            days.append(cur)
        cur += timedelta(days=1)
    return days


def scenario_for(zone: str, day: date):
    for z, d1, d2, mode, classes, people in SCENARIOS:
        if z == zone and date.fromisoformat(d1) <= day <= date.fromisoformat(d2):
            return mode, classes, people
    return None


def detections(mode, classes, people, hour, camera_id):
    if camera_id == "КАМ-03":            # общий план: техника далеко, видны только люди
        classes, people = [], min(people, 2)
    out = []
    for i, cls in enumerate(classes):
        y, w, h = BOX[cls]
        base = 120 + i * 620
        shift = ((hour - 8) % 4) * 170 if mode == MOVING else 0
        x = min(base + shift, FRAME_W - w - 10)
        out.append({"class": cls, "confidence": CONF[cls], "bbox": [x, y, w, h]})
    for p in range(people):
        out.append({"class": "person", "confidence": CONF["person"] - p * .03,
                    "bbox": [1420 + p * 90, 540, 70, 190]})
    return out


def build_frames() -> list[dict]:
    cameras = {r["camera_id"]: r["zone"]
               for r in csv.DictReader((DEMO / "cameras.csv").open(encoding="utf-8"))}
    frames = []
    for day in working_days(START, TODAY):
        for camera_id, zone in cameras.items():
            found = scenario_for(zone, day)
            if found is None:
                continue
            mode, classes, people = found
            for hour in HOURS:
                stamp = datetime(day.year, day.month, day.day, hour, 0, tzinfo=MSK)
                frames.append({
                    "frame_id": f"{camera_id}_{day:%Y%m%d}_{hour:02d}00",
                    "camera_id": camera_id,
                    "captured_at": stamp.isoformat(),
                    "detections": [] if mode == EMPTY
                                  else detections(mode, classes, people, hour, camera_id),
                })
    return frames


# ------------------------------------------------- проверка ожидаемых статусов
def parse_catalog():
    entries = []
    for r in csv.DictReader((DEMO / "catalog.csv").open(encoding="utf-8")):
        classes = {}
        for chunk in r["required_classes"].split(";"):
            name, _, count = chunk.partition(":")
            classes[name.strip()] = int(count)
        entries.append({"pattern": r["work_pattern"].lower(), "classes": classes,
                        "people": int(r["min_people"]), "days": int(r["required_days"])})
    return entries


def entry_for(entries, name):
    hits = [e for e in entries if e["pattern"] in name.lower()]
    return max(hits, key=lambda e: len(e["pattern"])) if hits else None


def day_level(day_frames, entry):
    """0 — ничего; 1 — хотя бы один требуемый класс; 2 — всё найдено и есть движение."""
    if not day_frames:
        return None
    observed = {}
    for f in day_frames:
        for cls, n in Counter(d["class"] for d in f["detections"]).items():
            observed[cls] = max(observed.get(cls, 0), n)

    present = [c for c, need in entry["classes"].items() if observed.get(c, 0) >= need]
    if not present:
        return 0
    if len(present) < len(entry["classes"]) or observed.get("person", 0) < entry["people"]:
        return 1

    # движение считается внутри одной камеры: кадры разных камер сравнивать нельзя
    by_camera = {}
    for f in day_frames:
        by_camera.setdefault(f["camera_id"], []).append(f)
    for cam_frames in by_camera.values():
        cam_frames.sort(key=lambda f: f["captured_at"])
        for cls in entry["classes"]:
            series = [sorted(d["bbox"][0] + d["bbox"][2] / 2
                             for d in f["detections"] if d["class"] == cls)
                      for f in cam_frames]
            for a, b in zip(series, series[1:]):
                if len(a) != len(b):
                    return 2
                if any(abs(x - y) > FRAME_W * 0.05 for x, y in zip(a, b)):
                    return 2
    return 1


def decide(days, entry, work, today):
    if entry is None:
        return "not_checked"
    if days and all(l is None for l in days):
        return "not_checked"
    levels = [l for l in days if l is not None]
    top = max(levels) if levels else 0
    confirmed = sum(1 for l in levels if l >= 2)
    if work["fact"] >= 100 and top < 1:
        return "reported_mismatch"
    if today > work["end"] and top < 2:
        return "not_confirmed"
    if top == 1:
        return "resources_only"
    if confirmed >= entry["days"]:
        return "confirmed"
    if today < work["start"]:
        return "not_started"
    return "in_progress"


def check(frames):
    cameras = {r["camera_id"]: r["zone"]
               for r in csv.DictReader((DEMO / "cameras.csv").open(encoding="utf-8"))}
    entries = parse_catalog()
    by_zone_day = {}
    for f in frames:
        key = (cameras[f["camera_id"]], f["captured_at"][:10])
        by_zone_day.setdefault(key, []).append(f)

    rows = []
    for r in csv.DictReader((DEMO / "plan.csv").open(encoding="utf-8")):
        work = {"id": r["work_id"], "name": r["name"], "zone": r["zone"],
                "start": date.fromisoformat(r["plan_start"]),
                "end": date.fromisoformat(r["plan_end"]),
                "fact": float(r["fact_percent"] or 0)}
        entry = entry_for(entries, work["name"])
        levels, confirmed = [], 0
        if entry:
            for day in working_days(work["start"], min(work["end"], TODAY)):
                lvl = day_level(by_zone_day.get((work["zone"], day.isoformat()), []), entry)
                levels.append(lvl)
                if lvl is not None and lvl >= 2:
                    confirmed += 1
        status = decide(levels, entry, work, TODAY)
        # прогноз считается только для начатых работ: у будущей отставания нет
        started = entry is not None and TODAY >= work["start"]
        delay = max(0, entry["days"] - confirmed) if started else 0
        rows.append((work["id"], work["name"], work["zone"], status, len(levels), confirmed, delay))
    return rows


if __name__ == "__main__":
    frames = build_frames()
    (DEMO / "detections.json").write_text(
        json.dumps({"generated_for": TODAY.isoformat(), "frames": frames},
                   ensure_ascii=False, indent=1), encoding="utf-8")

    rows = check(frames)
    width = max(len(r[1]) for r in rows)
    print(f"кадров: {len(frames)}\n")
    print(f"{'ID':6} {'РАБОТА':{width}} {'ЗОНА':10} {'СТАТУС':20} ДНЕЙ ПОДТВ ОТСТ")
    for r in rows:
        print(f"{r[0]:6} {r[1]:{width}} {r[2]:10} {r[3]:20} {r[4]:4} {r[5]:5} {r[6]:4}")
    print()
    counts = Counter(r[3] for r in rows)
    for k, v in counts.most_common():
        print(f"  {k}: {v}")
    print(f"  прогноз отставания: +{max(r[6] for r in rows)} дн.")
