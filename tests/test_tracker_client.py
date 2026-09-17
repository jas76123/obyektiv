"""Тесты клиента Tracker: заголовки, ошибки, страницы поиска. Без сети."""
import json
import os
import unittest
from unittest import mock

from scripts.tracker_client import TrackerClient, TrackerError, client_from_env


class FakeTransport:
    """Записывает запросы и отдаёт заранее заданные ответы по очереди."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def __call__(self, method, url, headers, data):
        self.calls.append((method, url, headers, json.loads(data) if data else None))
        status, body = self.responses.pop(0)
        return status, json.dumps(body).encode("utf-8") if body is not None else b""


class HeadersTest(unittest.TestCase):
    def test_sends_oauth_and_org_headers(self):
        t = FakeTransport([(200, {"login": "jas"})])
        client = TrackerClient(token="secret", org_id="123", transport=t)
        self.assertEqual(client.myself()["login"], "jas")
        method, url, headers, _ = t.calls[0]
        self.assertEqual(method, "GET")
        self.assertEqual(url, "https://api.tracker.yandex.net/v2/myself")
        self.assertEqual(headers["Authorization"], "OAuth secret")
        self.assertEqual(headers["X-Org-ID"], "123")
        self.assertNotIn("X-Cloud-Org-ID", headers)

    def test_cloud_org_header(self):
        t = FakeTransport([(200, {"login": "jas"})])
        client = TrackerClient(token="s", cloud_org_id="bpf", transport=t)
        client.myself()
        self.assertEqual(t.calls[0][2]["X-Cloud-Org-ID"], "bpf")

    def test_requires_some_org_id(self):
        with self.assertRaises(ValueError):
            TrackerClient(token="s")


class ErrorsTest(unittest.TestCase):
    def test_raises_on_4xx_with_body(self):
        t = FakeTransport([(403, {"errorMessages": ["нет прав"]})])
        client = TrackerClient(token="s", org_id="1", transport=t)
        with self.assertRaises(TrackerError) as ctx:
            client.myself()
        self.assertEqual(ctx.exception.status, 403)
        self.assertIn("нет прав", ctx.exception.body)

    def test_get_queue_returns_none_on_404(self):
        t = FakeTransport([(404, {"errorMessages": ["нет очереди"]})])
        client = TrackerClient(token="s", org_id="1", transport=t)
        self.assertIsNone(client.get_queue("OBJ"))


class MethodsTest(unittest.TestCase):
    def setUp(self):
        self.t = FakeTransport([])
        self.client = TrackerClient(token="s", org_id="1", transport=self.t)

    def test_create_queue_body(self):
        self.t.responses = [(201, {"key": "OBJ"})]
        self.client.create_queue("OBJ", "Объектив", lead="jas")
        method, url, _, body = self.t.calls[0]
        self.assertEqual((method, url), ("POST", "https://api.tracker.yandex.net/v2/queues/"))
        self.assertEqual(body["key"], "OBJ")
        self.assertEqual(body["lead"], "jas")
        self.assertEqual(body["issueTypesConfig"][0]["workflow"], "oicn")

    def test_create_component_body(self):
        self.t.responses = [(201, {"id": 7, "name": "ML"})]
        out = self.client.create_component("OBJ", "ML")
        self.assertEqual(out["id"], 7)
        _, url, _, body = self.t.calls[0]
        self.assertEqual(url, "https://api.tracker.yandex.net/v2/components/")
        self.assertEqual(body, {"name": "ML", "queue": "OBJ", "assignAuto": False})

    def test_search_issues_walks_pages(self):
        page1 = [{"key": f"OBJ-{i}"} for i in range(100)]
        page2 = [{"key": "OBJ-100"}]
        self.t.responses = [(200, page1), (200, page2)]
        issues = self.client.search_issues("OBJ")
        self.assertEqual(len(issues), 101)
        self.assertIn("perPage=100", self.t.calls[0][1])
        self.assertIn("page=1", self.t.calls[0][1])
        self.assertIn("page=2", self.t.calls[1][1])
        self.assertEqual(self.t.calls[0][3], {"filter": {"queue": "OBJ"}})

    def test_update_issue_uses_patch(self):
        self.t.responses = [(200, {"key": "OBJ-3"})]
        self.client.update_issue("OBJ-3", {"summary": "x"})
        method, url, _, body = self.t.calls[0]
        self.assertEqual((method, url), ("PATCH", "https://api.tracker.yandex.net/v2/issues/OBJ-3"))
        self.assertEqual(body, {"summary": "x"})

    def test_add_dependency_body(self):
        self.t.responses = [(201, {"id": 1})]
        self.client.add_dependency("OBJ-1", "OBJ-5")
        _, url, _, body = self.t.calls[0]
        self.assertEqual(url, "https://api.tracker.yandex.net/v2/issues/OBJ-1/links")
        self.assertEqual(body, {"relationship": "depends on", "issue": "OBJ-5"})


class EnvTest(unittest.TestCase):
    def test_client_from_env_reads_variables(self):
        with mock.patch.dict(os.environ, {"TRACKER_TOKEN": "tok", "TRACKER_ORG_ID": "42"}, clear=False):
            client = client_from_env(transport=FakeTransport([]))
        self.assertEqual(client.headers()["X-Org-ID"], "42")

    def test_client_from_env_fails_without_token(self):
        env = {k: v for k, v in os.environ.items() if not k.startswith("TRACKER_")}
        with mock.patch.dict(os.environ, env, clear=True):
            with self.assertRaises(SystemExit):
                client_from_env(transport=FakeTransport([]))


if __name__ == "__main__":
    unittest.main()
