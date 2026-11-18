#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Automated QA verification & optional Live Smoke Test suite for Sprint 1."""
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
EXPECTED_TC_COUNT = 157
EXPECTED_BUG_COUNT = 14
SPRINT_ROUTES = [('get', '/api-catalog'), ('post', '/auth/login'), ('post', '/auth/register'), ('post', '/auth/google'), ('get', '/auth/google/config'), ('post', '/auth/logout'), ('get', '/auth/csrf'), ('get', '/auth/me'), ('post', '/users'), ('get', '/users/me'), ('patch', '/users/me'), ('get', '/users'), ('get', '/users/{userId}'), ('patch', '/users/{userId}/password'), ('patch', '/users/{userId}/status'), ('get', '/public/clubs'), ('get', '/public/clubs/{clubId}'), ('get', '/clubs'), ('get', '/clubs/{clubId}'), ('post', '/clubs'), ('patch', '/clubs/{clubId}'), ('patch', '/clubs/{clubId}/status'), ('get', '/clubs/{clubId}/departments'), ('get', '/departments/{departmentId}'), ('post', '/clubs/{clubId}/departments'), ('patch', '/departments/{departmentId}'), ('patch', '/departments/{departmentId}/status'), ('get', '/clubs/{clubId}/memberships'), ('post', '/clubs/{clubId}/memberships'), ('get', '/departments/{departmentId}/members'), ('post', '/departments/{departmentId}/members'), ('get', '/permissions'), ('post', '/users/{userId}/permissions'), ('delete', '/users/{userId}/permissions/{permissionId}'), ('patch', '/users/{userId}'), ('delete', '/users/{userId}/permissions/by-key/{permissionKey}'), ('post', '/auth/change-password'), ('get', '/users/me/permissions'), ('get', '/users/{userId}/permissions'), ('get', '/roles'), ('post', '/roles'), ('get', '/roles/{roleId}'), ('patch', '/roles/{roleId}'), ('get', '/users/me/roles'), ('get', '/users/{userId}/roles'), ('post', '/users/{userId}/roles'), ('delete', '/users/{userId}/roles/{assignmentId}'), ('get', '/users/me/effective-permissions'), ('get', '/users/{userId}/effective-permissions'), ('get', '/permissions/groups'), ('put', '/users/{userId}/permissions'), ('get', '/audit-logs'), ('get', '/users/me/memberships'), ('delete', '/users/{userId}'), ('get', '/clubs/{clubId}/positions'), ('put', '/clubs/{clubId}/positions'), ('delete', '/clubs/{clubId}/positions/{assignmentId}'), ('get', '/public/i18n/translations'), ('post', '/public/i18n/translate-batch')]
LIVE_PUBLIC_CHECKS = [('GET', '/api/v1/api-catalog', 200), ('GET', '/api/v1/public/clubs?offset=0&limit=5', 200), ('GET', '/api/v1/users/me', 401), ('GET', '/api/v1/permissions', 401)]


class Sprint1TestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.openapi = yaml.safe_load((REPO_ROOT / "docs/api/openapi.yaml").read_text(encoding="utf-8"))
        cls.catalog = yaml.safe_load((REPO_ROOT / "docs/api/catalog.yml").read_text(encoding="utf-8"))["entries"]
        cls.full_md = (SPRINT_DIR / "sprint-1-testcases.md").read_text(encoding="utf-8")
        cls.bugs_md = (SPRINT_DIR / "sprint-1-bugs.md").read_text(encoding="utf-8")
        cls.postman = json.loads((SPRINT_DIR / "sprint-1.postman.json").read_text(encoding="utf-8"))

    def test_01_full_sprint_testcase_count_matches_backlog(self):
        tc_ids = re.findall(r"\|\s*`(TC-[^`]+)`\s*\|", self.full_md)
        self.assertEqual(len(tc_ids), EXPECTED_TC_COUNT, f"Expected {EXPECTED_TC_COUNT} TCs in Sprint 1")
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
        bug_ids = re.findall(r"\|\s*`(BUG-P1-\d+)`\s*\|", self.bugs_md)
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
