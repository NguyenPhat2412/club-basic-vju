"use client";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { apiModel, Club, Role, RoleAssignmentInput, Scope } from "@/lib/api";
import { FormField, Select } from "@/components/ui/input";

export type RoleDraft = { roleId: string; clubId: string; departmentId: string };
export const EMPTY_ROLE_DRAFT: RoleDraft = { roleId: "", clubId: "", departmentId: "" };

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: "Quản trị hệ thống",
  CLUB_PRESIDENT: "Chủ nhiệm CLB",
  CLUB_VICE_PRESIDENT: "Phó chủ nhiệm CLB",
  DEPARTMENT_HEAD: "Trưởng ban",
  CLUB_MEMBER: "Thành viên CLB",
};

const SCOPE_LABELS: Record<Scope, string> = { GLOBAL: "Toàn hệ thống", CLUB: "Theo CLB", DEPARTMENT: "Theo ban" };

export function roleLabel(role: { code?: string; roleCode?: string; name?: string; roleName?: string }) {
  const code = role.code ?? role.roleCode ?? "";
  return ROLE_LABELS[code] ?? role.name ?? role.roleName ?? code;
}

export function scopeLabel(scope: Scope) {
  return SCOPE_LABELS[scope];
}

export function toAssignment(draft: RoleDraft, roles: Role[]): RoleAssignmentInput | null {
  const role = roles.find((r) => r.id === draft.roleId);
  if (!role) return null;
  if (role.scope === "GLOBAL") return { roleId: role.id, scope: "GLOBAL" };
  if (role.scope === "CLUB") return draft.clubId ? { roleId: role.id, scope: "CLUB", clubId: draft.clubId } : null;
  return draft.departmentId ? { roleId: role.id, scope: "DEPARTMENT", departmentId: draft.departmentId } : null;
}

export function useRoleOptions(enabled = true) {
  const roles = useQuery({ queryKey: ["roles"], queryFn: apiModel.roles, enabled, staleTime: 60_000 });
  const clubs = useQuery({ queryKey: ["clubs", "all"], queryFn: () => apiModel.clubs("", "", 0, 100), enabled, staleTime: 60_000 });
  return {
    roles: (roles.data ?? []).filter((r) => r.active),
    clubs: clubs.data?.items ?? [],
    error: roles.error ?? clubs.error,
  };
}

export function RolePicker({ value, onChange, roles, clubs, onRemove }: {
  value: RoleDraft;
  onChange: (value: RoleDraft) => void;
  roles: Role[];
  clubs: Club[];
  onRemove?: () => void;
}) {
  const role = roles.find((r) => r.id === value.roleId);
  const needsClub = role?.scope === "CLUB" || role?.scope === "DEPARTMENT";
  const departments = useQuery({
    queryKey: ["departments", value.clubId],
    queryFn: () => apiModel.departments(value.clubId),
    enabled: role?.scope === "DEPARTMENT" && !!value.clubId,
  });

  return (
    <div className="relative grid gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
      <div className={onRemove ? "pr-9 sm:col-span-2" : "sm:col-span-2"}>
        <FormField label="Vai trò" required>
          <Select value={value.roleId} onChange={(e) => onChange({ roleId: e.target.value, clubId: "", departmentId: "" })}>
            <option value="">Chọn vai trò…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{roleLabel(r)} · {scopeLabel(r.scope)}</option>)}
          </Select>
        </FormField>
      </div>
      {needsClub && (
        <FormField label="Câu lạc bộ" required>
          <Select value={value.clubId} onChange={(e) => onChange({ ...value, clubId: e.target.value, departmentId: "" })}>
            <option value="">Chọn CLB…</option>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
          </Select>
        </FormField>
      )}
      {role?.scope === "DEPARTMENT" && (
        <FormField label="Ban" required>
          <Select value={value.departmentId} disabled={!value.clubId} onChange={(e) => onChange({ ...value, departmentId: e.target.value })}>
            <option value="">{value.clubId ? "Chọn ban…" : "Chọn CLB trước"}</option>
            {(departments.data?.items ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </FormField>
      )}
      {onRemove && (
        <button type="button" aria-label="Bỏ vai trò này" onClick={onRemove}
          className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
