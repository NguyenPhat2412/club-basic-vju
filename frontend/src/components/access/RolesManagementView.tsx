"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { KeyRound, Plus, Save, Undo2 } from "lucide-react";
import { apiModel, PermissionGroup, Role, Scope } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useI18n } from "@/providers/I18nContext";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { roleLabel } from "@/components/shared/RolePicker";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BREADTH, fitsRole, permissionDesc, permissionTitle } from "@/utils/access/permission-meta";
import { CreateRoleModal } from "@/components/access/CreateRoleModal";
import { RolesFilterBar } from "@/components/access/RolesFilterBar";
import { RolesMatrixTable } from "@/components/access/RolesMatrixTable";
import { RoleFocusedEditor } from "@/components/access/RoleFocusedEditor";

export function RolesManagementView() {
  useI18n();
  const session = useSession();
  const queryClient = useQueryClient();
  const canView = session.can("role.view");
  const canManage = session.can("role.manage");
  const roles = useQuery({ queryKey: qk.roles(), queryFn: apiModel.roles, enabled: canView });
  const groups = useQuery({
    queryKey: qk.permissionGroups(),
    queryFn: apiModel.permissionGroups,
    enabled: canView && session.can("permission.view"),
  });

  const [draft, setDraft] = useState<Record<string, Set<string>>>({});
  const [moduleFilter, setModuleFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"" | Scope>("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"matrix" | "focused">("matrix");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(() => new Set());
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

  const activeFocusedRole = useMemo(
    () => columns.find((r) => r.id === selectedRoleId) ?? columns.find((r) => !r.locked) ?? columns[0],
    [columns, selectedRoleId]
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
          return permissionTitle(p).toLowerCase().includes(q) || permissionDesc(p).toLowerCase().includes(q);
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

  const toggleModuleForRole = (role: Role, group: PermissionGroup) => {
    const eligibleKeys = group.permissions.filter((p) => fitsRole(p, role)).map((p) => p.permissionKey);
    if (!eligibleKeys.length) return;
    setDraft((prev) => {
      const next = new Set(prev[role.id] ?? role.permissionKeys);
      const allChecked = eligibleKeys.every((k) => next.has(k));
      for (const key of eligibleKeys) {
        if (allChecked) next.delete(key);
        else next.add(key);
      }
      return { ...prev, [role.id]: next };
    });
  };

  const toggleCollapseModule = (moduleKey: string) =>
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleKey)) next.delete(moduleKey);
      else next.add(moduleKey);
      return next;
    });

  const allCollapsed = filteredGroups.length > 0 && filteredGroups.every((g) => collapsedModules.has(g.module));
  const toggleAllModules = () =>
    setCollapsedModules(allCollapsed ? new Set() : new Set(filteredGroups.map((g) => g.module)));

  const hasFilters = Boolean(search.trim() || moduleFilter || scopeFilter);
  const clearFilters = () => {
    setSearch("");
    setModuleFilter("");
    setScopeFilter("");
  };

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
      await queryClient.invalidateQueries({ queryKey: qk.roles() });
      await queryClient.invalidateQueries({ queryKey: qk.me("permissions") });
      await queryClient.invalidateQueries({ queryKey: qk.optionalMe("permissions") });
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
  const visiblePermCount = filteredGroups.reduce((sum, g) => sum + g.permissions.length, 0);

  return (
    <ListPage title="Chức vụ & Phân quyền" fillViewport>
      <BreadcrumbToolbar
        crumbs={[
          { label: "Tổng quan", href: "/dashboard" },
          { label: "Quản trị hệ thống" },
          { label: "Chức vụ & Phân quyền" },
        ]}
        titleBadge={<CountBadge>{columns.length} vai trò · {allPermissions.length} quyền</CountBadge>}
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
              {dirtyRoles.length > 0 && (
                <Button variant="outline" size="sm" disabled={save.isPending} onClick={() => { setDraft({}); save.reset(); }}>
                  <Undo2 size={14} /> Hoàn tác
                </Button>
              )}
              <Button size="sm" disabled={!dirtyRoles.length || !!emptyRole || save.isPending} onClick={() => save.mutate()}>
                <Save size={14} /> {save.isPending ? "Đang lưu…" : `Lưu thay đổi${dirtyRoles.length ? ` (${dirtyRoles.length})` : ""}`}
              </Button>
            </>
          ) : undefined
        }
      />

      <RolesFilterBar
        search={search}
        onSearchChange={setSearch}
        moduleFilter={moduleFilter}
        onModuleFilterChange={setModuleFilter}
        scopeFilter={scopeFilter}
        onScopeFilterChange={setScopeFilter}
        groups={groups.data ?? []}
        visiblePermCount={visiblePermCount}
        totalPermCount={allPermissions.length}
        filteredGroupCount={filteredGroups.length}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        allCollapsed={allCollapsed}
        onToggleAllModules={toggleAllModules}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-3 py-3 sm:px-5 sm:py-3">
        {notice && <Notice tone="success">{notice}</Notice>}
        {emptyRole && (
          <Notice tone="error">Vai trò {roleLabel(emptyRole)} phải được tích ít nhất một quyền chức năng.</Notice>
        )}
        {save.error && <Notice tone="error">{describeError(save.error)}</Notice>}

        {roles.isPending || groups.isLoading ? (
          <LoadingRows />
        ) : roles.isError || groups.isError ? (
          <ErrorState message={describeError(roles.error ?? groups.error)} onRetry={() => { roles.refetch(); groups.refetch(); }} />
        ) : !filteredGroups.length ? (
          <EmptyState
            icon={<KeyRound />}
            title="Không tìm thấy quyền chức năng phù hợp bộ lọc"
            actionLabel={hasFilters ? "Xoá bộ lọc" : undefined}
            onAction={hasFilters ? clearFilters : undefined}
          />
        ) : viewMode === "focused" && activeFocusedRole ? (
          <RoleFocusedEditor
            columns={columns}
            selectedRole={activeFocusedRole}
            onSelectRole={setSelectedRoleId}
            filteredGroups={filteredGroups}
            dirtyRoles={dirtyRoles}
            busy={save.isPending}
            keysOf={keysOf}
            editable={editable}
            onTogglePermission={toggle}
            onToggleModuleForRole={toggleModuleForRole}
          />
        ) : (
          <RolesMatrixTable
            columns={columns}
            filteredGroups={filteredGroups}
            collapsedModules={collapsedModules}
            dirtyRoles={dirtyRoles}
            busy={save.isPending}
            keysOf={keysOf}
            editable={editable}
            onToggleCollapse={toggleCollapseModule}
            onTogglePermission={toggle}
            onToggleModuleForRole={toggleModuleForRole}
          />
        )}
      </div>

      {canManage && dirtyRoles.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-primary/25 bg-card px-4 py-2.5 shadow-sm sm:px-6">
          <p className="text-xs text-foreground">
            Đang có thay đổi chưa lưu cho <b className="text-primary">{dirtyRoles.map(roleLabel).join(", ")}</b>.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={save.isPending} onClick={() => { setDraft({}); save.reset(); }}>
              <Undo2 size={14} /> Hoàn tác tất cả
            </Button>
            <Button size="sm" disabled={!!emptyRole || save.isPending} onClick={() => save.mutate()}>
              <Save size={14} /> {save.isPending ? "Đang lưu…" : `Lưu phân quyền (${dirtyRoles.length})`}
            </Button>
          </div>
        </div>
      )}

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
