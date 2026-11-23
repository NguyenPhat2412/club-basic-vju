"use client";

import type { Department } from "@/lib/api";
import { Select } from "@/components/ui/input";

export type TaskScopeFilterValue = "ALL" | "CLUB_WIDE" | "DEPARTMENT";

const SCOPE_OPTIONS: { value: TaskScopeFilterValue; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "CLUB_WIDE", label: "Công việc chung toàn CLB" },
  { value: "DEPARTMENT", label: "Theo ban" },
];

export function TaskScopeFilter({
  scope,
  departmentId,
  departments,
  onChangeScope,
  onChangeDepartment,
}: {
  scope: TaskScopeFilterValue;
  departmentId: string;
  departments: Department[];
  onChangeScope: (next: TaskScopeFilterValue) => void;
  onChangeDepartment: (deptId: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Lọc phạm vi công việc"
        className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs"
      >
        {SCOPE_OPTIONS.map((opt) => {
          const active = scope === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChangeScope(opt.value)}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {scope === "DEPARTMENT" && (
        <Select
          aria-label="Lọc ban chuyên môn"
          value={departmentId}
          onChange={(e) => onChangeDepartment(e.target.value)}
          className="h-8 w-full text-xs sm:w-44"
        >
          <option value="">Tất cả các ban</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
