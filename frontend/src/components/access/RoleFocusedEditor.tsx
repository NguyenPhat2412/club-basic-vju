"use client";

import { CheckSquare, Lock, Minus, ShieldCheck, Square } from "lucide-react";
import { PermissionGroup, Role } from "@/lib/api";
import { roleLabel, scopeLabel } from "@/components/shared/RolePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fitsRole, moduleLabel, permissionDesc, permissionTitle } from "@/utils/access/permission-meta";

type Props = {
  columns: Role[];
  selectedRole: Role;
  onSelectRole: (roleId: string) => void;
  filteredGroups: PermissionGroup[];
  dirtyRoles: Role[];
  busy: boolean;
  keysOf: (role: Role) => Set<string>;
  editable: (role: Role) => boolean;
  onTogglePermission: (role: Role, permissionKey: string) => void;
  onToggleModuleForRole: (role: Role, group: PermissionGroup) => void;
};

export function RoleFocusedEditor({
  columns,
  selectedRole,
  onSelectRole,
  filteredGroups,
  dirtyRoles,
  busy,
  keysOf,
  editable,
  onTogglePermission,
  onToggleModuleForRole,
}: Props) {
  const roleKeys = keysOf(selectedRole);
  const isRoleEditable = editable(selectedRole) && !busy;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Horizontal role selector strip */}
      <div
        role="tablist"
        aria-label="Chọn vai trò cần phân quyền"
        className="flex shrink-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
      >
        {columns.map((role) => {
          const active = role.id === selectedRole.id;
          const isDirty = dirtyRoles.includes(role);
          const count = keysOf(role).size;
          return (
            <button
              key={role.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectRole(role.id)}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2 text-left transition-all",
                active
                  ? "border-primary bg-primary/8 shadow-2xs ring-1 ring-primary/25"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {role.locked ? (
                    <Lock size={12} className="shrink-0 text-primary" />
                  ) : (
                    <ShieldCheck size={13} className={cn("shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                  )}
                  <span className={cn("whitespace-nowrap text-xs font-bold", active ? "text-primary" : "text-foreground")}>
                    {roleLabel(role)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge tone={isDirty ? "primary" : "neutral"} dot={false}>
                    {scopeLabel(role.scope)}
                    {isDirty ? " · đã sửa" : ""}
                  </Badge>
                  <span className="font-mono text-[10.5px] font-semibold text-muted-foreground">{count} quyền</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Focused role status bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-foreground">{roleLabel(selectedRole)}</span>
          <Badge tone="neutral" dot={false}>{scopeLabel(selectedRole.scope)}</Badge>
          <span className="text-muted-foreground">
            {selectedRole.locked
              ? "Vai trò quản trị hệ thống mặc định có toàn quyền và không thể tắt quyền."
              : "Bấm trực tiếp vào từng quyền hoặc chọn nhanh cả phân hệ để cấp / thu hồi."}
          </span>
        </div>
        <span className="font-mono text-xs font-bold text-primary">{roleKeys.size} quyền đang bật</span>
      </div>

      {/* Spacious 2-column grid of permission modules */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 [scrollbar-gutter:stable]">
        <div className="grid grid-cols-1 gap-3.5 pb-4 xl:grid-cols-2">
          {filteredGroups.map((group) => {
            const eligible = group.permissions.filter((p) => fitsRole(p, selectedRole));
            const checkedCount = eligible.filter((p) => roleKeys.has(p.permissionKey)).length;
            const allChecked = eligible.length > 0 && checkedCount === eligible.length;
            const canBulk = isRoleEditable && eligible.length > 0;

            return (
              <section
                key={group.module}
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-secondary/65 px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="truncate text-xs font-extrabold uppercase tracking-wider text-primary">
                      {moduleLabel(group.module)}
                    </h3>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                      {checkedCount}/{eligible.length}
                    </span>
                  </div>
                  {canBulk && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-[11px]"
                      onClick={() => onToggleModuleForRole(selectedRole, group)}
                    >
                      {allChecked ? (
                        <>
                          <Square size={12} /> Bỏ chọn nhóm
                        </>
                      ) : (
                        <>
                          <CheckSquare size={12} /> Chọn tất cả
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="divide-y divide-border/45">
                  {group.permissions.map((permission) => {
                    const fits = fitsRole(permission, selectedRole);
                    const checked = roleKeys.has(permission.permissionKey);
                    const originallyChecked = selectedRole.permissionKeys.includes(permission.permissionKey);
                    const changed = checked !== originallyChecked;
                    const title = permissionTitle(permission);
                    const desc = permissionDesc(permission);

                    if (!fits) {
                      return (
                        <div
                          key={permission.id}
                          className="flex items-start justify-between gap-3 bg-muted/30 px-4 py-2.5 opacity-60"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold text-muted-foreground">{title}</span>
                              <span className="rounded-md border border-border/70 bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {scopeLabel(permission.scope)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{desc}</p>
                          </div>
                          <span
                            className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                            title={`Quyền ${scopeLabel(permission.scope).toLowerCase()} vượt quá phạm vi của vai trò`}
                          >
                            <Minus size={10} /> Ngoài phạm vi
                          </span>
                        </div>
                      );
                    }

                    return (
                      <label
                        key={permission.id}
                        className={cn(
                          "flex items-start gap-3 px-4 py-2.5 transition-colors",
                          isRoleEditable ? "cursor-pointer hover:bg-muted/40" : "cursor-default",
                          changed && "bg-primary/8"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-45"
                          aria-label={`${roleLabel(selectedRole)} · ${title}`}
                          checked={checked}
                          disabled={!isRoleEditable}
                          onChange={() => onTogglePermission(selectedRole, permission.permissionKey)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="text-xs font-bold text-foreground">{title}</span>
                            <div className="flex items-center gap-1.5">
                              {changed && <Badge tone="primary" dot={false}>Đã sửa</Badge>}
                              <span className="rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {scopeLabel(permission.scope)}
                              </span>
                            </div>
                          </div>
                          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
