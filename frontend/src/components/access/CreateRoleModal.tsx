"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldPlus } from "lucide-react";
import { apiModel, PermissionGroup, Role, Scope } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { scopeLabel } from "@/components/shared/RolePicker";
import { ModalShell } from "@/components/shared/Overlays";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import {
  codeFromName,
  fitsRole,
  moduleLabel,
  permissionDesc,
  permissionTitle,
} from "@/utils/access/permission-meta";

const EMPTY_NEW_ROLE = { name: "", scope: "CLUB" as Scope, description: "" };

export function CreateRoleModal({
  open,
  onClose,
  groups,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  groups: PermissionGroup[];
  onCreated: (role: Role) => void;
}) {
  const queryClient = useQueryClient();
  const [newRole, setNewRole] = useState(EMPTY_NEW_ROLE);
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());

  const newCode = codeFromName(newRole.name);
  const allPermissions = groups.flatMap((g) => g.permissions.filter((p) => p.active));
  const newFitting = allPermissions.filter((p) => newKeys.has(p.permissionKey) && fitsRole(p, newRole));

  const create = useMutation({
    mutationFn: () =>
      apiModel.createRole({
        code: newCode,
        name: newRole.name.trim(),
        description: newRole.description.trim() || undefined,
        scope: newRole.scope,
        permissionIds: newFitting.map((p) => p.id),
      }),
    onSuccess: async (role) => {
      setNewRole(EMPTY_NEW_ROLE);
      setNewKeys(new Set());
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      onCreated(role);
      onClose();
    },
  });

  const toggleNew = (key: string) =>
    setNewKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Tạo chức vụ / vai trò mới"
      icon={<ShieldPlus />}
      onSubmit={() => create.mutate()}
      submitLabel="Tạo vai trò"
      submitLoading={create.isPending}
      submitDisabled={!newRole.name.trim() || !newCode || newFitting.length === 0}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Tên vai trò" required hint="Ví dụ: Trưởng ban Truyền thông, Thủ quỹ, Cộng tác viên.">
          <Input
            value={newRole.name}
            onChange={(e) => setNewRole((r) => ({ ...r, name: e.target.value }))}
            placeholder="Nhập tên chức vụ / vai trò…"
          />
        </FormField>
        <FormField label="Phạm vi áp dụng" required hint="Chọn Theo CLB nếu cần duyệt đơn hoặc quản lý toàn CLB.">
          <Select
            value={newRole.scope}
            onChange={(e) => setNewRole((r) => ({ ...r, scope: e.target.value as Scope }))}
          >
            <option value="DEPARTMENT">{scopeLabel("DEPARTMENT")}</option>
            <option value="CLUB">{scopeLabel("CLUB")}</option>
            <option value="GLOBAL">{scopeLabel("GLOBAL")}</option>
          </Select>
        </FormField>
      </div>
      <FormField label="Mô tả trách nhiệm">
        <Textarea
          value={newRole.description}
          onChange={(e) => setNewRole((r) => ({ ...r, description: e.target.value }))}
          placeholder="Mô tả ngắn gọn nhiệm vụ của vai trò này…"
        />
      </FormField>
      <div className="space-y-2">
        <p className="text-sm font-bold">Quyền chức năng ({newFitting.length} đã tích chọn)</p>
        <div className="max-h-72 space-y-3 overflow-auto rounded-lg border border-border/60 p-3">
          {groups.map((group) => {
            const items = group.permissions.filter((p) => p.active && fitsRole(p, newRole));
            if (!items.length) return null;
            return (
              <div key={group.module}>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">
                  {moduleLabel(group.module)}
                </p>
                {items.map((p) => (
                  <label key={p.id} className="flex items-start gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted/50">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-primary"
                      checked={newKeys.has(p.permissionKey)}
                      onChange={() => toggleNew(p.permissionKey)}
                    />
                    <span>
                      <span className="text-xs font-semibold text-foreground">{permissionTitle(p)}</span>
                      <span className="block text-xs text-muted-foreground">{permissionDesc(p)}</span>
                    </span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {create.error && <p className="text-xs text-destructive">{describeError(create.error)}</p>}
    </ModalShell>
  );
}
