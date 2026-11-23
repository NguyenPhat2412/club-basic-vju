"use client";

import { Fragment } from "react";
import { ChevronDown, ChevronRight, Lock, Minus } from "lucide-react";
import { PermissionGroup, Role } from "@/lib/api";
import { roleLabel, scopeLabel } from "@/components/shared/RolePicker";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fitsRole, moduleLabel, permissionDesc, permissionTitle } from "@/utils/access/permission-meta";

type Props = {
  columns: Role[];
  filteredGroups: PermissionGroup[];
  collapsedModules: ReadonlySet<string>;
  dirtyRoles: Role[];
  busy: boolean;
  keysOf: (role: Role) => Set<string>;
  editable: (role: Role) => boolean;
  onToggleCollapse: (moduleKey: string) => void;
  onTogglePermission: (role: Role, permissionKey: string) => void;
  onToggleModuleForRole: (role: Role, group: PermissionGroup) => void;
};

export function RolesMatrixTable({
  columns,
  filteredGroups,
  collapsedModules,
  dirtyRoles,
  busy,
  keysOf,
  editable,
  onToggleCollapse,
  onTogglePermission,
  onToggleModuleForRole,
}: Props) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-card shadow-2xs [scrollbar-gutter:stable]">
      <table className="w-full min-w-[840px] border-collapse text-sm" aria-label="Ma trận phân quyền">
        <thead className="sticky top-0 z-20 border-b border-border bg-muted/95 backdrop-blur-xs">
          <tr>
            <th className="min-w-[260px] max-w-[360px] border-r border-border/70 bg-muted/95 px-4 py-3 text-left align-middle text-[11px] font-bold uppercase tracking-wider text-muted-foreground md:sticky md:left-0 md:z-30">
              Quyền chức năng &amp; Mô tả
            </th>
            {columns.map((role) => {
              const isDirty = dirtyRoles.includes(role);
              const count = keysOf(role).size;
              return (
                <th key={role.id} className="min-w-[118px] px-2.5 py-2.5 text-center align-top">
                  <div className="flex flex-col items-center gap-1">
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold leading-tight text-foreground">
                      {role.locked && <Lock size={11} className="shrink-0 text-primary" />}
                      <span>{roleLabel(role)}</span>
                    </span>
                    <Badge tone={isDirty ? "primary" : "neutral"} dot={false}>
                      {scopeLabel(role.scope)}
                      {isDirty ? " · đã sửa" : ""}
                    </Badge>
                    <span className="font-mono text-[10.5px] font-semibold text-muted-foreground">
                      {count} quyền
                    </span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filteredGroups.map((group) => {
            const isCollapsed = collapsedModules.has(group.module);
            return (
              <Fragment key={group.module}>
                <tr className="border-y border-border/80 bg-secondary/70">
                  <td className="border-r border-border/60 bg-secondary/95 px-3 py-2 md:sticky md:left-0 md:z-10">
                    <button
                      type="button"
                      onClick={() => onToggleCollapse(group.module)}
                      aria-expanded={!isCollapsed}
                      className="flex w-full items-center gap-2 text-left text-xs font-extrabold uppercase tracking-wider text-primary hover:opacity-85"
                    >
                      {isCollapsed ? (
                        <ChevronRight size={14} className="shrink-0" />
                      ) : (
                        <ChevronDown size={14} className="shrink-0" />
                      )}
                      <span className="truncate">{moduleLabel(group.module)}</span>
                      <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                        {group.permissions.length} quyền
                      </span>
                    </button>
                  </td>
                  {columns.map((role) => {
                    const eligible = group.permissions.filter((p) => fitsRole(p, role));
                    const roleKeys = keysOf(role);
                    const checkedCount = eligible.filter((p) => roleKeys.has(p.permissionKey)).length;
                    const allChecked = eligible.length > 0 && checkedCount === eligible.length;
                    const someChecked = checkedCount > 0 && checkedCount < eligible.length;
                    const canBulk = editable(role) && eligible.length > 0 && !busy;

                    return (
                      <td key={role.id} className="px-2 py-2 text-center">
                        {eligible.length === 0 ? (
                          <span className="inline-flex items-center justify-center text-muted-foreground/40" aria-hidden="true">
                            <Minus size={12} />
                          </span>
                        ) : (
                          <label
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold",
                              canBulk ? "cursor-pointer text-foreground hover:bg-card/80" : "cursor-default text-muted-foreground"
                            )}
                            title={
                              canBulk
                                ? `${allChecked ? "Bỏ chọn" : "Chọn"} toàn bộ ${eligible.length} quyền của ${moduleLabel(group.module)} cho ${roleLabel(role)}`
                                : `${checkedCount}/${eligible.length} quyền`
                            }
                          >
                            <input
                              type="checkbox"
                              className="size-3.5 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`${allChecked ? "Bỏ chọn" : "Chọn"} nhóm ${moduleLabel(group.module)} cho ${roleLabel(role)}`}
                              checked={allChecked}
                              ref={(el) => {
                                if (el) el.indeterminate = someChecked;
                              }}
                              disabled={!canBulk}
                              onChange={() => onToggleModuleForRole(role, group)}
                            />
                            <span className="font-mono text-[10px] tabular-nums">
                              {checkedCount}/{eligible.length}
                            </span>
                          </label>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {!isCollapsed &&
                  group.permissions.map((permission) => {
                    const title = permissionTitle(permission);
                    const desc = permissionDesc(permission);
                    return (
                      <tr
                        key={permission.id}
                        className="border-b border-border/45 transition-colors hover:bg-muted/35"
                      >
                        <td className="min-w-[260px] max-w-[360px] border-r border-border/60 bg-card px-4 py-2.5 md:sticky md:left-0 md:z-10">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <p className="text-xs font-bold leading-snug text-foreground">{title}</p>
                            <span className="shrink-0 rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {scopeLabel(permission.scope)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{desc}</p>
                        </td>
                        {columns.map((role) => {
                          const fits = fitsRole(permission, role);
                          const checked = keysOf(role).has(permission.permissionKey);
                          const originallyChecked = role.permissionKeys.includes(permission.permissionKey);
                          const changed = checked !== originallyChecked;
                          const disabled = !editable(role) || !fits || busy;
                          return (
                            <td
                              key={role.id}
                              className={cn(
                                "px-2 py-2.5 text-center transition-colors",
                                !fits && "bg-muted/35",
                                changed && "bg-primary/10 ring-1 ring-inset ring-primary/25"
                              )}
                            >
                              {!fits ? (
                                <span
                                  className="inline-flex size-6 items-center justify-center text-muted-foreground/45"
                                  title={`Quyền ${scopeLabel(permission.scope).toLowerCase()} không áp dụng cho vai trò ${scopeLabel(role.scope).toLowerCase()}`}
                                  aria-label={`Không áp dụng cho ${roleLabel(role)}`}
                                >
                                  <Minus size={13} />
                                </span>
                              ) : (
                                <label className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md hover:bg-primary/8">
                                  <input
                                    type="checkbox"
                                    className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-45"
                                    aria-label={`${roleLabel(role)} · ${title}`}
                                    title={`${roleLabel(role)} — ${title}`}
                                    checked={checked}
                                    disabled={disabled}
                                    onChange={() => onTogglePermission(role, permission.permissionKey)}
                                  />
                                </label>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
