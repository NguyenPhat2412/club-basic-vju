"use client";

import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  KeyRound,
  Layers,
  Lock,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { apiModel, Role, Scope } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useI18n } from "@/providers/I18nContext";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { roleLabel, scopeLabel } from "@/components/shared/RolePicker";
import { StatSummaryStrip } from "@/components/shared/StatCards";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { Select } from "@/components/ui/input";
import { Badge, CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BREADTH,
  fitsRole,
  moduleLabel,
  permissionDesc,
  permissionTitle,
} from "@/utils/access/permission-meta";
import { CreateRoleModal } from "@/components/access/CreateRoleModal";

export function RolesManagementView() {
  useI18n();
  const session = useSession();
  const queryClient = useQueryClient();
  const canView = session.can("role.view");
  const canManage = session.can("role.manage");
  const roles = useQuery({ queryKey: ["roles"], queryFn: apiModel.roles, enabled: canView });
  const groups = useQuery({
    queryKey: ["permission-groups"],
    queryFn: apiModel.permissionGroups,
    enabled: canView && session.can("permission.view"),
  });

  const [draft, setDraft] = useState<Record<string, Set<string>>>({});
  const [moduleFilter, setModuleFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"" | Scope>("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);

  const allPermissions = (groups.data ?? []).flatMap((g) => g.permissions.filter((p) => p.active));

  const columns = useMemo(
    () =>
      [...(roles.data ?? [])]
        .filter((r) => r.active)
        .sort(
          (a, b) =>
            Number(b.locked) - Number(a.locked) ||
            BREADTH[b.scope] - BREADTH[a.scope] ||
            Number(b.system) - Number(a.system) ||
            a.name.localeCompare(b.name, "vi")
        ),
    [roles.data]
  );

  const idByKey = useMemo(
    () => new Map((groups.data ?? []).flatMap((g) => g.permissions.map((p) => [p.permissionKey, p.id] as const))),
    [groups.data]
  );

  const keysOf = (role: Role) => draft[role.id] ?? new Set(role.permissionKeys);
  const dirtyRoles = columns.filter((role) => {
    const current = draft[role.id];
    if (!current) return false;
    return current.size !== role.permissionKeys.length || role.permissionKeys.some((k) => !current.has(k));
  });

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (groups.data ?? [])
      .filter((g) => !moduleFilter || g.module === moduleFilter)
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter((p) => {
          if (!p.active) return false;
          if (scopeFilter && p.scope !== scopeFilter) return false;
          if (!q) return true;
          const t = permissionTitle(p).toLowerCase();
          const d = permissionDesc(p).toLowerCase();
          return t.includes(q) || d.includes(q);
        }),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [groups.data, moduleFilter, scopeFilter, search]);

  const toggle = (role: Role, key: string) =>
    setDraft((prev) => {
      const next = new Set(prev[role.id] ?? role.permissionKeys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [role.id]: next };
    });

  const save = useMutation({
    mutationFn: async () => {
      for (const role of dirtyRoles) {
        const ids = [...keysOf(role)].map((k) => idByKey.get(k)).filter((id): id is string => !!id);
        await apiModel.updateRolePermissions(role.id, ids);
      }
    },
    onSuccess: async () => {
      setNotice(
        `Đã lưu phân quyền cho ${dirtyRoles.map(roleLabel).join(", ")}. Giao diện của các tài khoản mang vai trò này đã được cập nhật ngay.`
      );
      setDraft({});
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      await queryClient.invalidateQueries({ queryKey: ["me", "permissions"] });
      await queryClient.invalidateQueries({ queryKey: ["optional-me", "permissions"] });
    },
  });

  if (session.ready && !canView) {
    return (
      <ListPage title="Chức vụ & Phân quyền">
        <EmptyState icon={<KeyRound />} title="Bạn không có quyền xem bảng phân quyền" />
      </ListPage>
    );
  }

  const editable = (role: Role) => canManage && !role.locked;
  const emptyRole = dirtyRoles.find((role) => keysOf(role).size === 0);

  return (
    <ListPage title="Chức vụ & Phân quyền">
      <BreadcrumbToolbar
        crumbs={[
          { label: "Tổng quan", href: "/dashboard" },
          { label: "Quản trị hệ thống" },
          { label: "Chức vụ & Phân quyền" },
        ]}
        titleBadge={<CountBadge>{columns.length} vai trò</CountBadge>}
        onRefresh={() => {
          roles.refetch();
          groups.refetch();
        }}
        extraActions={
          canManage ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
                <Plus size={14} /> Tạo vai trò mới
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!dirtyRoles.length || save.isPending}
                onClick={() => {
                  setDraft({});
                  save.reset();
                }}
              >
                <Undo2 size={14} /> Hoàn tác
              </Button>
              <Button
                size="sm"
                disabled={!dirtyRoles.length || !!emptyRole || save.isPending}
                onClick={() => save.mutate()}
              >
                <Save size={14} />{" "}
                {save.isPending ? "Đang lưu…" : `Lưu thay đổi${dirtyRoles.length ? ` (${dirtyRoles.length})` : ""}`}
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4 sm:px-6">
        <StatSummaryStrip
          className="shrink-0"
          items={[
            { label: "Chức vụ & Vai trò", value: columns.length, icon: ShieldCheck },
            { label: "Tổng quyền chức năng", value: allPermissions.length, icon: CheckSquare },
            { label: "Phân hệ nghiệp vụ", value: (groups.data ?? []).length, icon: Layers },
            {
              label: "Vai trò đang chỉnh sửa",
              value: dirtyRoles.length,
              valueClassName: "text-primary",
              icon: Sparkles,
            },
          ]}
        />

        <div className="flex shrink-0 flex-col justify-between gap-2.5 rounded-xl border border-border bg-card px-4 py-3 shadow-2xs lg:flex-row lg:items-center">
          <p className="text-xs leading-5 text-muted-foreground">
            Tích chọn ô quyền để cấp chức năng cho từng vai trò. Cột <b>Quản trị hệ thống</b> luôn có toàn quyền; các ô mờ là quyền vượt quá phạm vi của vai trò.
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <div className="relative w-full sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên quyền chức năng…"
                className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-7 text-xs focus:border-primary focus:outline-hidden"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <Select
              aria-label="Lọc theo phân hệ"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="h-9 w-full text-xs sm:w-48"
            >
              <option value="">Tất cả phân hệ ({(groups.data ?? []).length})</option>
              {(groups.data ?? []).map((g) => (
                <option key={g.module} value={g.module}>
                  {moduleLabel(g.module)}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Lọc theo phạm vi"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as "" | Scope)}
              className="h-9 w-full text-xs sm:w-40"
            >
              <option value="">Mọi phạm vi</option>
              <option value="GLOBAL">{scopeLabel("GLOBAL")}</option>
              <option value="CLUB">{scopeLabel("CLUB")}</option>
              <option value="DEPARTMENT">{scopeLabel("DEPARTMENT")}</option>
            </Select>
          </div>
        </div>

        {notice && <Notice tone="success">{notice}</Notice>}
        {emptyRole && (
          <Notice tone="error">Vai trò {roleLabel(emptyRole)} phải được tích ít nhất một quyền chức năng.</Notice>
        )}
        {save.error && <Notice tone="error">{describeError(save.error)}</Notice>}

        {roles.isPending || groups.isLoading ? (
          <LoadingRows />
        ) : roles.isError || groups.isError ? (
          <ErrorState
            message={describeError(roles.error ?? groups.error)}
            onRetry={() => {
              roles.refetch();
              groups.refetch();
            }}
          />
        ) : !filteredGroups.length ? (
          <EmptyState icon={<KeyRound />} title="Không tìm thấy quyền chức năng phù hợp bộ lọc" />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-card shadow-2xs [scrollbar-gutter:stable]">
            <table className="w-full min-w-[960px] border-collapse text-sm" aria-label="Ma trận phân quyền">
              <thead className="sticky top-0 z-20 border-b border-border bg-muted/85 backdrop-blur-xs">
                <tr>
                  <th className="sticky left-0 z-20 min-w-[310px] max-w-[380px] border-r border-border/70 bg-muted/95 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Quyền chức năng & Mô tả
                  </th>
                  {columns.map((role) => {
                    const isDirty = dirtyRoles.includes(role);
                    const count = keysOf(role).size;
                    return (
                      <th key={role.id} className="w-36 min-w-[136px] px-3 py-3 text-center align-top">
                        <div className="flex flex-col items-center gap-1">
                          <span className="flex items-center gap-1 text-xs font-extrabold text-foreground">
                            {role.locked && <Lock size={12} className="text-primary" />}
                            {roleLabel(role)}
                          </span>
                          <Badge tone={isDirty ? "primary" : "neutral"} dot={false}>
                            {scopeLabel(role.scope)}
                            {isDirty ? " · đã sửa" : ""}
                          </Badge>
                          <span className="font-mono text-[10px] font-medium text-muted-foreground">{count} quyền</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((group) => (
                  <Fragment key={group.module}>
                    <tr className="border-y border-border/70 bg-secondary/65">
                      <td
                        colSpan={columns.length + 1}
                        className="px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-primary"
                      >
                        <div className="flex items-center gap-2">
                          <span>{moduleLabel(group.module)}</span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                            {group.permissions.length} quyền
                          </span>
                        </div>
                      </td>
                    </tr>
                    {group.permissions.map((permission) => {
                      const title = permissionTitle(permission);
                      const desc = permissionDesc(permission);
                      return (
                        <tr
                          key={permission.id}
                          className="border-b border-border/40 transition-colors hover:bg-muted/35"
                        >
                          <td className="sticky left-0 z-10 min-w-[310px] max-w-[380px] border-r border-border/60 bg-card px-4 py-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-bold text-foreground">{title}</p>
                              <span className="rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {scopeLabel(permission.scope)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11.5px] leading-4 text-muted-foreground">{desc}</p>
                          </td>
                          {columns.map((role) => {
                            const fits = fitsRole(permission, role);
                            const checked = keysOf(role).has(permission.permissionKey);
                            const originallyChecked = role.permissionKeys.includes(permission.permissionKey);
                            const changed = checked !== originallyChecked;
                            const disabled = !editable(role) || !fits || save.isPending;
                            return (
                              <td
                                key={role.id}
                                className={cn(
                                  "w-36 min-w-[136px] px-2 py-2.5 text-center transition-colors",
                                  !fits && "bg-muted/35",
                                  changed && "bg-primary/8"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-35"
                                  aria-label={`${roleLabel(role)} · ${title}`}
                                  title={
                                    !fits
                                      ? `Quyền ${scopeLabel(permission.scope).toLowerCase()} không gán được cho vai trò ${scopeLabel(role.scope).toLowerCase()}`
                                      : `${roleLabel(role)} — ${title}`
                                  }
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => toggle(role, permission.permissionKey)}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateRoleModal
        open={creating}
        onClose={() => setCreating(false)}
        groups={groups.data ?? []}
        onCreated={(role) =>
          setNotice(`Đã tạo chức vụ / vai trò "${role.name}". Bạn có thể bổ nhiệm ngay ở trang Hồ sơ tài khoản.`)
        }
      />
    </ListPage>
  );
}
