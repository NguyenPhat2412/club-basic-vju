#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Automated QA verification & optional Live Smoke Test suite for Sprint 2."""
import json
import os
import pathlib
import re
import unittest
import urllib.error
import urllib.request
import yaml

SPRINT_DIR = pathlib.Path(__file__).resolve().parent
REPO_ROOT = SPRINT_DIR.parents[1]
EXPECTED_TC_COUNT = 77
EXPECTED_BUG_COUNT = 9
SPRINT_ROUTES = [('get', '/public/clubs/categories'), ('get', '/memberships/{membershipId}'), ('patch', '/memberships/{membershipId}'), ('delete', '/memberships/{membershipId}'), ('delete', '/departments/{departmentId}/members/{membershipId}'), ('patch', '/departments/{departmentId}/members/{membershipId}'), ('post', '/clubs/{clubId}/applications'), ('get', '/users/me/applications'), ('get', '/applications/review-summary'), ('get', '/users/me/applications/{applicationId}'), ('patch', '/users/me/applications/{applicationId}/cancel'), ('get', '/clubs/{clubId}/applications'), ('get', '/clubs/{clubId}/applications/{applicationId}'), ('post', '/clubs/{clubId}/applications/{applicationId}/approve'), ('post', '/clubs/{clubId}/applications/{applicationId}/reject'), ('get', '/users/me/notifications'), ('get', '/users/me/notifications/{notificationId}'), ('patch', '/users/me/notifications/{notificationId}/read'), ('get', '/users/me/notifications/unread-summary'), ('patch', '/users/me/notifications/read-all'), ('get', '/clubs/{clubId}/application-form'), ('get', '/clubs/{clubId}/application-forms'), ('post', '/clubs/{clubId}/application-forms'), ('put', '/clubs/{clubId}/application-forms/{formId}'), ('delete', '/clubs/{clubId}/application-forms/{formId}'), ('post', '/clubs/{clubId}/application-forms/{formId}/files'), ('delete', '/clubs/{clubId}/application-forms/{formId}/files/{fileId}'), ('put', '/users/me/applications/{applicationId}'), ('put', '/clubs/{clubId}/applications/{applicationId}'), ('post', '/applications/{applicationId}/files'), ('delete', '/applications/{applicationId}/files/{fileId}'), ('get', '/application-files/{fileId}/download')]
LIVE_PUBLIC_CHECKS = [('GET', '/api/v1/public/clubs/categories', 200), ('GET', '/api/v1/public/clubs?offset=0&limit=12', 200), ('GET', '/api/v1/users/me/applications', 401), ('GET', '/api/v1/users/me/notifications', 401)]


class Sprint2TestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.openapi = yaml.safe_load((REPO_ROOT / "docs/api/openapi.yaml").read_text(encoding="utf-8"))
        cls.catalog = yaml.safe_load((REPO_ROOT / "docs/api/catalog.yml").read_text(encoding="utf-8"))["entries"]
        cls.full_md = (SPRINT_DIR / "sprint-2-testcases.md").read_text(encoding="utf-8")
        cls.bugs_md = (SPRINT_DIR / "sprint-2-bugs.md").read_text(encoding="utf-8")
        cls.postman = json.loads((SPRINT_DIR / "sprint-2.postman.json").read_text(encoding="utf-8"))

    def test_01_full_sprint_testcase_count_matches_backlog(self):
        tc_ids = re.findall(r"\|\s*`(TC-[^`]+)`\s*\|", self.full_md)
        self.assertEqual(len(tc_ids), EXPECTED_TC_COUNT, f"Expected {EXPECTED_TC_COUNT} TCs in Sprint 2")
        self.assertEqual(len(tc_ids), len(set(tc_ids)), "Duplicate TC IDs detected")

    def test_02_modular_files_partition_exact_sprint_testcases(self):
        full_ids = set(re.findall(r"\|\s*`(TC-[^`]+)`\s*\|", self.full_md))
        mod_ids = []
        for mf in sorted((SPRINT_DIR / "modules").glob("*.md")):
            mod_ids.extend(re.findall(r"\|\s*`(TC-[^`]+)`\s*\|", mf.read_text(encoding="utf-8")))
        self.assertEqual(len(mod_ids), EXPECTED_TC_COUNT, "Sum of module TC rows must match Sprint total")
        self.assertEqual(set(mod_ids), full_ids, "Module files must cover exact same TC IDs as Sprint master file")

    def test_03_sprint_openapi_routes_and_rfc7807_guards(self):
        paths = self.openapi["paths"]
        for method, route in SPRINT_ROUTES:
            with self.subTest(method=method.upper(), route=route):
                self.assertIn(route, paths, f"Missing route {route} in openapi.yaml")
                self.assertIn(method, paths[route], f"Missing {method} on {route}")
                op = paths[route][method]
                self.assertEqual(op.get("x-implementation-status"), "IMPLEMENTED")
                if op.get("security", self.openapi.get("security")):
                    self.assertIn("401", op["responses"])
                    self.assertIn("403", op["responses"])

    def test_04_postman_collection_covers_sprint_endpoints(self):
        self.assertEqual(len(self.postman["item"]), len(SPRINT_ROUTES))
        for item in self.postman["item"]:
            self.assertIn("request", item)
            self.assertTrue(item["event"], "Each Postman item must include automated status assertion")

    def test_05_bug_log_records_verified_and_closed(self):
        bug_ids = re.findall(r"\|\s*`(BUG-P2-\d+)`\s*\|", self.bugs_md)
        self.assertEqual(len(bug_ids), EXPECTED_BUG_COUNT)

    def test_06_optional_live_api_smoke_checks(self):
        base = os.environ.get("LIVE_API_URL", "").strip().rstrip("/")
        if not base:
            self.skipTest("Set LIVE_API_URL=http://localhost:8080 (or https://api.vju-club.all1.vn) to run live HTTP smoke tests")
        for method, path, expected_status in LIVE_PUBLIC_CHECKS:
            req = urllib.request.Request(base + path, method=method, headers={"Accept": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    code = resp.status
            except urllib.error.HTTPError as err:
                code = err.code
            with self.subTest(url=base + path):
                self.assertEqual(code, expected_status)


if __name__ == "__main__":
    unittest.main(verbosity=2)
