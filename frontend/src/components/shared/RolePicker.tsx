"use client";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { X } from "lucide-react";
import { getPresentationLocale } from "@/i18n/config";
import { translateKey, translateUiText } from "@/i18n/translator";
import { apiModel, Club, Role, Scope } from "@/lib/api";
import { FormField, Select } from "@/components/ui/input";
import { EMPTY_ROLE_DRAFT, RoleDraft, toAssignment } from "@/utils/access/user-access-draft";

export { EMPTY_ROLE_DRAFT, type RoleDraft, toAssignment };

const SCOPE_LABELS: Record<Scope, string> = { GLOBAL: "Toàn hệ thống", CLUB: "Theo CLB", DEPARTMENT: "Theo ban" };

export function roleLabel(role: { code?: string; roleCode?: string; name?: string; roleName?: string }) {
  const raw = role.name ?? role.roleName ?? role.code ?? role.roleCode ?? "";
  return translateUiText(raw, getPresentationLocale());
}

export function scopeLabel(scope: Scope) {
  return translateKey(getPresentationLocale(), `scope.${scope}`, undefined, SCOPE_LABELS[scope]);
}

export function useRoleOptions(
  enabledOrOpts: boolean | { loadClubs?: boolean; loadRoles?: boolean } = true
) {
  const loadRoles =
    typeof enabledOrOpts === "boolean" ? enabledOrOpts : Boolean(enabledOrOpts.loadRoles);
  const loadClubs =
    typeof enabledOrOpts === "boolean" ? enabledOrOpts : Boolean(enabledOrOpts.loadClubs);
  const roles = useQuery({ queryKey: qk.roles(), queryFn: apiModel.roles, enabled: loadRoles, staleTime: 60_000 });
  const clubs = useQuery({ queryKey: qk.clubs("all"), queryFn: () => apiModel.clubs("", "", 0, 100), enabled: loadClubs, staleTime: 60_000 });
  return {
    roles: (roles.data ?? []).filter((r) => r.active && r.code !== "DEPARTMENT_HEAD"),
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
    queryKey: qk.departments(value.clubId),
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
        <FormField label="Ban" optional>
          <Select value={value.departmentId} disabled={!value.clubId} onChange={(e) => onChange({ ...value, departmentId: e.target.value })}>
            <option value="">{value.clubId ? "Toàn CLB (không giới hạn ban)" : "Chọn CLB trước"}</option>
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
