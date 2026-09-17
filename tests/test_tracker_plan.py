"""Тесты чтения плана работ из CSV."""
import tempfile
import unittest
from pathlib import Path

from scripts.tracker_plan import (PlanTask, description_for, load_plan,
                                  tracker_priority, unique_id, validate_plan)

HEADER = "key,component,title,assignee,start,deadline,tag,blocks,priority,done_criterion\n"


def write_csv(rows: str) -> Path:
    tmp = tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf-8")
    tmp.write(HEADER + rows)
    tmp.close()
    return Path(tmp.name)


class LoadPlanTest(unittest.TestCase):
    def test_reads_rows_into_tasks(self):
        path = write_csv(
            'M-1,Лид,Веха 1,Денис,2026-09-19,2026-09-19,веха,,critical,"Всё лежит в репо"\n'
            'ML-02,ML,JSON,Георгий,2026-09-17,2026-09-18,,M-1,critical,"Поля добавлены"\n'
        )
        tasks = load_plan(path)
        self.assertEqual(len(tasks), 2)
        self.assertEqual(tasks[0], PlanTask(
            key="M-1", component="Лид", title="Веха 1", assignee="Денис",
            start="2026-09-19", deadline="2026-09-19", tags=["веха"], blocks=None,
            priority="critical", done_criterion="Всё лежит в репо"))
        self.assertEqual(tasks[1].blocks, "M-1")
        self.assertEqual(tasks[1].tags, [])

    def test_validate_reports_broken_link_and_bad_dates(self):
        path = write_csv(
            'A-1,ML,Задача,Георгий,2026-09-20,2026-09-18,,M-9,normal,"x"\n'
        )
        errors = validate_plan(load_plan(path))
        self.assertIn("A-1: связь с несуществующей вехой M-9", errors)
        self.assertIn("A-1: дата начала позже дедлайна", errors)

    def test_validate_reports_duplicate_keys(self):
        path = write_csv(
            'A-1,ML,Задача,Георгий,2026-09-17,2026-09-18,,,normal,"x"\n'
            'A-1,ML,Задача 2,Георгий,2026-09-17,2026-09-18,,,normal,"y"\n'
        )
        self.assertIn("A-1: ключ повторяется", validate_plan(load_plan(path)))

    def test_validate_passes_on_real_plan(self):
        real = Path(__file__).resolve().parent.parent / "docs" / "superpowers" / "specs" / "2026-09-17-obyektiv-work-plan.csv"
        tasks = load_plan(real)
        self.assertEqual(validate_plan(tasks), [])
        self.assertEqual(len(tasks), 44)


class HelpersTest(unittest.TestCase):
    def test_priority_mapping(self):
        self.assertEqual(tracker_priority("normal"), "normal")
        self.assertEqual(tracker_priority("high"), "critical")
        self.assertEqual(tracker_priority("critical"), "blocker")
        with self.assertRaises(ValueError):
            tracker_priority("urgent")

    def test_unique_id(self):
        self.assertEqual(unique_id("ML-02"), "obj-plan-ML-02")

    def test_description_contains_criterion_and_key(self):
        task = PlanTask("FE-01", "Фронт", "Каркас", "Жасмина", "2026-09-17",
                        "2026-09-18", [], None, "critical", "npm run dev открывает экраны")
        text = description_for(task)
        self.assertIn("Критерий готовности", text)
        self.assertIn("npm run dev открывает экраны", text)
        self.assertIn("FE-01", text)
        self.assertNotIn("Цель", text)

    def test_description_starts_with_goal_when_present(self):
        task = PlanTask("FE-01", "Фронт", "Каркас", "Жасмина", "2026-09-18",
                        "2026-09-18", [], None, "critical", "экраны открываются", goal="основа для экранов")
        text = description_for(task)
        self.assertTrue(text.startswith("**Цель:** основа для экранов"))
        self.assertIn("**Критерий готовности:** экраны открываются", text)

    def test_real_plan_has_goal_for_every_task(self):
        real = Path(__file__).resolve().parent.parent / "docs" / "superpowers" / "specs" / "2026-09-17-obyektiv-work-plan.csv"
        self.assertTrue(all(t.goal for t in load_plan(real)))


if __name__ == "__main__":
    unittest.main()
