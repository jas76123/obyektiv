"""Тонкий клиент REST API Yandex Tracker на стандартной библиотеке.

Токен и организация берутся из окружения (см. client_from_env), в код и логи
не попадают. Транспорт подменяем, чтобы тесты шли без сети.

Запуск проверки доступа:  python3 -c "from scripts.tracker_client import *; print(client_from_env().myself()['login'])"
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Callable

BASE_URL = "https://api.tracker.yandex.net"
PAGE_SIZE = 100

Transport = Callable[[str, str, dict, bytes | None], tuple[int, bytes]]


class TrackerError(Exception):
    """Ответ API с кодом 4xx/5xx."""

    def __init__(self, status: int, body: str):
        super().__init__(f"Tracker {status}: {body[:300]}")
        self.status = status
        self.body = body


def urllib_transport(method: str, url: str, headers: dict, data: bytes | None) -> tuple[int, bytes]:
    """Настоящий транспорт: один HTTP-запрос через urllib."""
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


class TrackerClient:
    def __init__(self, token: str, org_id: str | None = None,
                 cloud_org_id: str | None = None, transport: Transport | None = None):
        if not org_id and not cloud_org_id:
            raise ValueError("нужен TRACKER_ORG_ID (Яндекс 360) или TRACKER_CLOUD_ORG_ID (Yandex Cloud)")
        self._token = token
        self._org_id = org_id
        self._cloud_org_id = cloud_org_id
        self._transport = transport or urllib_transport

    def headers(self) -> dict:
        h = {"Authorization": f"OAuth {self._token}", "Content-Type": "application/json"}
        if self._org_id:
            h["X-Org-ID"] = self._org_id
        else:
            h["X-Cloud-Org-ID"] = self._cloud_org_id
        return h

    def request(self, method: str, path: str, body: Any = None, params: dict | None = None) -> Any:
        url = BASE_URL + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
        status, raw = self._transport(method, url, self.headers(), data)
        text = raw.decode("utf-8", errors="replace") if raw else ""
        if status >= 400:
            raise TrackerError(status, text)
        return json.loads(text) if text else None

    # --- пользователи и очередь ---
    def myself(self) -> dict:
        return self.request("GET", "/v2/myself")

    def get_queue(self, key: str) -> dict | None:
        try:
            return self.request("GET", f"/v2/queues/{key}")
        except TrackerError as e:
            if e.status == 404:
                return None
            raise

    def create_queue(self, key: str, name: str, lead: str) -> dict:
        body = {
            "key": key, "name": name, "lead": lead,
            "defaultType": "task", "defaultPriority": "normal",
            "issueTypesConfig": [{"issueType": "task", "workflow": "oicn", "resolutions": ["wontFix"]}],
        }
        return self.request("POST", "/v2/queues/", body)

    # --- компоненты ---
    def list_components(self, queue: str) -> list[dict]:
        return self.request("GET", f"/v2/queues/{queue}/components") or []

    def create_component(self, queue: str, name: str) -> dict:
        return self.request("POST", "/v2/components/", {"name": name, "queue": queue, "assignAuto": False})

    # --- задачи ---
    def search_issues(self, queue: str) -> list[dict]:
        """Все задачи очереди, постранично."""
        out: list[dict] = []
        page = 1
        while True:
            chunk = self.request("POST", "/v2/issues/_search", {"filter": {"queue": queue}},
                                 params={"perPage": PAGE_SIZE, "page": page}) or []
            out.extend(chunk)
            if len(chunk) < PAGE_SIZE:
                return out
            page += 1

    def create_issue(self, fields: dict) -> dict:
        return self.request("POST", "/v2/issues/", fields)

    def update_issue(self, key: str, fields: dict) -> dict:
        return self.request("PATCH", f"/v2/issues/{key}", fields)

    # --- связи ---
    def list_links(self, key: str) -> list[dict]:
        return self.request("GET", f"/v2/issues/{key}/links") or []

    def add_dependency(self, milestone_key: str, task_key: str) -> dict:
        """Веха зависит от задачи: на Ганте задача блокирует веху."""
        return self.request("POST", f"/v2/issues/{milestone_key}/links",
                            {"relationship": "depends on", "issue": task_key})


def client_from_env(transport: Transport | None = None) -> TrackerClient:
    """Собирает клиент из TRACKER_TOKEN и TRACKER_ORG_ID / TRACKER_CLOUD_ORG_ID."""
    token = os.environ.get("TRACKER_TOKEN")
    if not token:
        sys.exit("Нет TRACKER_TOKEN в окружении. См. docs/superpowers/specs/2026-09-17-tracker-setup.md")
    org_id = os.environ.get("TRACKER_ORG_ID") or None
    cloud_org_id = os.environ.get("TRACKER_CLOUD_ORG_ID") or None
    if not org_id and not cloud_org_id:
        sys.exit("Нет TRACKER_ORG_ID или TRACKER_CLOUD_ORG_ID в окружении.")
    return TrackerClient(token=token, org_id=org_id, cloud_org_id=cloud_org_id, transport=transport)
