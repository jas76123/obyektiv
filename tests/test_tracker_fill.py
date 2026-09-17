"""Тесты сведения плана с очередью Tracker. Клиент подменён."""
import json
import tempfile
import unittest
from pathlib import Path

from scripts.tracker_fill import check, issue_fields, load_users, main, plan_actions, sync
from scripts.tracker_plan import PlanTask

USERS = {"Жасмина": "jas", "Георгий": "geo", "Денис": "den"}
COMPONENTS = {"ML": 1, "Лид": 2}


def task(key="ML-02", blocks="M-1", assignee="Георгий", component="ML", tags=None):
    return PlanTask(key, component, "JSON детекций", assignee, "2026-09-17", "2026-09-18",
                    tags or [], blocks, "critical", "Поля добавлены")


class FakeClient:
    """Помнит вызовы и изображает очередь с уже существующими задачами."""

    def __init__(self, issues=None, components=None, links=None):
        self.issues = issues or []
        self.components = components or []
        self.links = links or {}
        self.calls = []
        self.counter = 100

    def myself(self):
        return {"login": "jas"}

    def get_queue(self, key):
        return {"key": key}

    def create_queue(self, key, name, lead):
        self.calls.append(("create_queue", key))
        return {"key": key}

    def list_components(self, queue):
        return self.components

    def create_component(self, queue, name):
        self.calls.append(("create_component", name))
        comp = {"id": len(self.components) + 1, "name": name}
        self.components.append(comp)
        return comp

    def search_issues(self, queue):
        return self.issues

    def create_issue(self, fields):
        self.calls.append(("create_issue", fields))
        self.counter += 1
        return {"key": f"OBJ-{self.counter}", "unique": fields["unique"]}

    def update_issue(self, key, fields):
        self.calls.append(("update_issue", key, fields))
        return {"key": key}

    def list_links(self, key):
        return self.links.get(key, [])

    def add_dependency(self, milestone_key, task_key):
        self.calls.append(("add_dependency", milestone_key, task_key))
        return {"id": 1}


class UsersTest(unittest.TestCase):
    def test_load_users_reads_json(self):
        tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
        json.dump({"Жасмина": "jas", "Денис": ""}, tmp, ensure_ascii=False)
        tmp.close()
        self.assertEqual(load_users(Path(tmp.name)), {"Жасмина": "jas", "Денис": ""})


class IssueFieldsTest(unittest.TestCase):
    def test_fields_for_create(self):
        f = issue_fields(task(), USERS, COMPONENTS)
        self.assertEqual(f["summary"], "ML-02 · JSON детекций")
        self.assertEqual(f["assignee"], "geo")
        self.assertEqual(f["priority"], "blocker")
        self.assertEqual(f["start"], "2026-09-17")
        self.assertEqual(f["deadline"], "2026-09-18")
        self.assertEqual(f["components"], [1])
        self.assertEqual(f["unique"], "obj-plan-ML-02")
        self.assertIn("Поля добавлены", f["description"])

    def test_empty_login_means_no_assignee(self):
        f = issue_fields(task(assignee="Александр"), {"Александр": ""}, COMPONENTS)
        self.assertNotIn("assignee", f)

    def test_unknown_name_raises(self):
        with self.assertRaises(KeyError):
            issue_fields(task(assignee="Некто"), USERS, COMPONENTS)

    def test_tags_pass_through(self):
        f = issue_fields(task(key="M-1", blocks=None, component="Лид", tags=["веха"]), USERS, COMPONENTS)
        self.assertEqual(f["tags"], ["веха"])


class PlanActionsTest(unittest.TestCase):
    def test_splits_create_update_extra_and_ignores_foreign(self):
        tasks = [task(key="M-1", blocks=None, component="Лид"), task(key="ML-02")]
        existing = [
            {"key": "OBJ-1", "unique": "obj-plan-M-1"},
            {"key": "OBJ-2", "unique": "obj-plan-OLD-9"},
            {"key": "OBJ-3", "summary": "чужая задача"},
        ]
        create, update, extra = plan_actions(tasks, existing)
        self.assertEqual([t.key for t in create], ["ML-02"])
        self.assertEqual([(k, t.key) for k, t in update], [("OBJ-1", "M-1")])
        self.assertEqual([e["key"] for e in extra], ["OBJ-2"])


class SyncTest(unittest.TestCase):
    def test_dry_run_changes_nothing(self):
        client = FakeClient()
        report = sync(client, [task(key="M-1", blocks=None, component="Лид")], USERS, apply=False, log=lambda *a: None)
        self.assertEqual(client.calls, [])
        self.assertEqual(report["created"], ["M-1"])

    def test_apply_creates_components_issues_and_links(self):
        client = FakeClient()
        tasks = [task(key="M-1", blocks=None, component="Лид", tags=["веха"]), task(key="ML-02")]
        report = sync(client, tasks, USERS, apply=True, log=lambda *a: None)
        names = [c for c in client.calls if c[0] == "create_component"]
        self.assertEqual([c[1] for c in names], ["ML", "Лид"])
        created = [c for c in client.calls if c[0] == "create_issue"]
        self.assertEqual(len(created), 2)
        deps = [c for c in client.calls if c[0] == "add_dependency"]
        self.assertEqual(deps, [("add_dependency", report["key_map"]["M-1"], report["key_map"]["ML-02"])])
        self.assertEqual(report["linked"], [("ML-02", "M-1")])

    def test_apply_updates_existing_and_skips_existing_link(self):
        existing = [{"key": "OBJ-1", "unique": "obj-plan-M-1"}, {"key": "OBJ-2", "unique": "obj-plan-ML-02"}]
        links = {"OBJ-1": [{"type": {"id": "depends"}, "direction": "outward", "object": {"key": "OBJ-2"}}]}
        client = FakeClient(issues=existing, components=[{"id": 1, "name": "ML"}, {"id": 2, "name": "Лид"}], links=links)
        tasks = [task(key="M-1", blocks=None, component="Лид", tags=["веха"]), task(key="ML-02")]
        report = sync(client, tasks, USERS, apply=True, log=lambda *a: None)
        updates = [c for c in client.calls if c[0] == "update_issue"]
        self.assertEqual({c[1] for c in updates}, {"OBJ-1", "OBJ-2"})
        self.assertNotIn("unique", updates[0][2])
        self.assertNotIn("queue", updates[0][2])
        self.assertEqual([c for c in client.calls if c[0] == "add_dependency"], [])
        self.assertEqual(report["skipped_links"], [("ML-02", "M-1")])
        self.assertEqual(report["updated"], ["M-1", "ML-02"])

    def test_creates_queue_when_missing(self):
        client = FakeClient()
        client.get_queue = lambda key: None
        sync(client, [], USERS, apply=True, log=lambda *a: None)
        self.assertIn(("create_queue", "OBJ"), client.calls)


class CheckTest(unittest.TestCase):
    def full_issue(self, key, uniq, assignee="geo"):
        return {"key": key, "unique": uniq, "assignee": {"id": assignee}, "start": "2026-09-17",
                "deadline": "2026-09-18", "components": [{"id": 1}]}

    def test_check_passes_when_everything_matches(self):
        tasks = [task(key="M-1", blocks=None, component="Лид", tags=["веха"]), task(key="ML-02")]
        issues = [self.full_issue("OBJ-1", "obj-plan-M-1"), self.full_issue("OBJ-2", "obj-plan-ML-02")]
        links = {"OBJ-1": [{"type": {"id": "depends"}, "object": {"key": "OBJ-2"}}]}
        client = FakeClient(issues=issues, links=links)
        self.assertEqual(check(client, tasks), [])

    def test_check_reports_missing_fields_count_and_links(self):
        tasks = [task(key="M-1", blocks=None, component="Лид", tags=["веха"]), task(key="ML-02")]
        bad = {"key": "OBJ-1", "unique": "obj-plan-M-1", "assignee": None, "start": None,
               "deadline": "2026-09-19", "components": []}
        client = FakeClient(issues=[bad], links={})
        problems = check(client, tasks)
        self.assertIn("в очереди 1 наших задач, в CSV 2", problems)
        self.assertIn("OBJ-1 (M-1): нет исполнителя", problems)
        self.assertIn("OBJ-1 (M-1): нет даты начала", problems)
        self.assertIn("OBJ-1 (M-1): нет компонента", problems)
        self.assertIn("ML-02: нет в очереди", problems)

    def test_check_reports_missing_link_when_both_issues_exist(self):
        tasks = [task(key="M-1", blocks=None, component="Лид", tags=["веха"]), task(key="ML-02")]
        issues = [self.full_issue("OBJ-1", "obj-plan-M-1"), self.full_issue("OBJ-2", "obj-plan-ML-02")]
        client = FakeClient(issues=issues, links={})
        self.assertEqual(check(client, tasks), ["веха M-1: нет связи от ML-02"])

    def test_main_rejects_invalid_plan(self):
        with self.assertRaises(SystemExit):
            main(["--dry-run", "--plan", "/nonexistent.csv"])


if __name__ == "__main__":
    unittest.main()
