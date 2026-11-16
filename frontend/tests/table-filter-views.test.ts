import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const SRC_ROOT = path.join(process.cwd(), "src");

const GROUP_1_TABLE_MODULES = [
  "components/management/ClubsDirectoryTab.tsx",
  "components/management/ClubMembersTab.tsx",
  "components/department/DepartmentTableSection.tsx",
  "components/application/ClubApplicationsTab.tsx",
  "components/application/FormsTab.tsx",
  "components/document/DocumentTable.tsx",
  "components/event/EventsTab.tsx",
  "components/task/TasksTab.tsx",
  "components/notification/NotificationsView.tsx",
  "components/club/MyMembershipsView.tsx",
  "components/application/MyApplicationsView.tsx",
  "components/schedule/ScheduleView.tsx",
  "components/event/EventsPortalView.tsx",
  "components/event/MyEventsHistorySection.tsx",
  "components/user/UsersManagementView.tsx",
  "components/audit/AuditLogsView.tsx",
];

test("all Group-1 operational/management views render sortable DataTables and obey < 400 lines", () => {
  const dataTable = fs.readFileSync(path.join(SRC_ROOT, "components/shared/DataTable.tsx"), "utf8");
  assert.ok(dataTable.includes("alwaysTable = true"), "DataTable must default alwaysTable to true");

  for (const rel of GROUP_1_TABLE_MODULES) {
    const abs = path.join(SRC_ROOT, rel);
    const content = fs.readFileSync(abs, "utf8");
    const lineCount = content.split("\n").length;
    assert.ok(lineCount < 400, `${rel} must stay < 400 lines (got ${lineCount})`);
    assert.ok(content.includes("<DataTable"), `${rel} must render <DataTable`);
    if (rel !== "components/document/DocumentTable.tsx") {
      assert.ok(content.includes("sortValue:"), `${rel} must provide sortable columns via sortValue`);
    }
  }
});

test("both ClubsDiscoveryView (/clubs) and ClubsDirectoryTab (/management?tab=clubs) provide Bảng | Thẻ view-mode toggle", () => {
  const discovery = fs.readFileSync(path.join(SRC_ROOT, "components/club/ClubsDiscoveryView.tsx"), "utf8");
  const discoveryTable = fs.readFileSync(path.join(SRC_ROOT, "components/club/ClubsDiscoveryTable.tsx"), "utf8");
  const directory = fs.readFileSync(path.join(SRC_ROOT, "components/management/ClubsDirectoryTab.tsx"), "utf8");

  for (const [name, content] of [
    ["ClubsDiscoveryView.tsx", discovery],
    ["ClubsDirectoryTab.tsx", directory],
  ] as const) {
    assert.ok(content.includes('useState<"table" | "cards">("table")'), `${name} must default viewMode to "table"`);
    assert.ok(content.includes('setViewMode("table")'), `${name} must allow switching to Table view`);
    assert.ok(content.includes('setViewMode("cards")'), `${name} must allow switching to Cards view`);
    assert.ok(content.split("\n").length < 400, `${name} must stay < 400 lines`);
  }

  assert.ok(discoveryTable.includes("<DataTable"), "ClubsDiscoveryTable.tsx must render <DataTable");
  assert.ok(discoveryTable.includes("sortValue:"), "ClubsDiscoveryTable.tsx must support column sorting");
});
