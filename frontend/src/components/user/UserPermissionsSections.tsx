"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { KeyRound, Plus, Sparkles, Trash2 } from "lucide-react";
import { apiModel, Club, PermissionItem, Scope, User, UserPermission } from "@/lib/api";
import { useCriticalActionOtp } from "@/hooks/useCriticalActionOtp";
import { Otp2FaChallengeModal } from "@/components/auth/Otp2FaChallengeModal";
import { Section } from "@/components/shared/Overlays";
import { scopeLabel } from "@/components/shared/RolePicker";
import { ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { formatDay } from "@/lib/utils";
import {
  moduleLabel,
  permissionDesc,
  permissionTitle,
} from "@/utils/access/permission-meta";
import {
  ALL_DEPARTMENTS_VALUE,
  DirectPermissionDraft,
  EMPTY_DIRECT_PERM_DRAFT,
  resolveNextPermScope,
  toDirectPermissionPayload,
} from "@/utils/access/user-access-draft";

export function UserPermissionsSections({
  user,
  clubs,
  canAssign,
  canRevoke,
  assignmentTarget,
  draft,
  onDraftChange,
  onRefreshEffective,
}: {
  user: User;
  clubs: Club[];
  canAssign: boolean;
  canRevoke: boolean;
  assignmentTarget: (a: { scope: string; clubId?: string; departmentId?: string }) => string;
  draft?: DirectPermissionDraft;
  onDraftChange?: (next: DirectPermissionDraft) => void;
  onRefreshEffective?: () => void;
}) {
  const queryClient = useQueryClient();
  const roleOtp = useCriticalActionOtp("ROLE_CHANGE");
  const [internalDraft, setInternalDraft] = useState<DirectPermissionDraft>(EMPTY_DIRECT_PERM_DRAFT);
  const [sectionNotice, setSectionNotice] = useState("");

  const activeDraft = draft ?? internalDraft;
  const updateDraft = (next: DirectPermissionDraft) => {
    if (onDraftChange) onDraftChange(next);
    else setInternalDraft(next);
  };

  const detailPermissions = useQuery({
    queryKey: qk.userPermissions(user.id),
    queryFn: () => apiModel.userPermissions(user.id),
  });
  const detailEffective = useQuery({
    queryKey: qk.userEffectivePermissions(user.id),
    queryFn: () => apiModel.userEffectivePermissions(user.id),
  });
  const permGroups = useQuery({
    queryKey: qk.permissionGroups(),
    queryFn: apiModel.permissionGroups,
    staleTime: 60_000,
  });
  const permDepartments = useQuery({
    queryKey: qk.departments(activeDraft.clubId),
    queryFn: () => apiModel.departments(activeDraft.clubId),
    enabled: activeDraft.scope === "DEPARTMENT" && !!activeDraft.clubId,
  });

  const activeGroups = useMemo(
    () =>
      (permGroups.data ?? [])
        .map((g) => ({ ...g, permissions: g.permissions.filter((p) => p.active) }))
        .filter((g) => g.permissions.length > 0),
    [permGroups.data],
  );

  const allPermissions = useMemo<PermissionItem[]>(
    () => activeGroups.flatMap((g) => g.permissions),
    [activeGroups],
  );

  const permByKey = useMemo(
    () => new Map(allPermissions.map((p) => [p.permissionKey, p] as const)),
    [allPermissions],
  );

  const selectedPerm = allPermissions.find((p) => p.id === activeDraft.permissionId);
  const permPayload = toDirectPermissionPayload(activeDraft, allPermissions);

  const invalidateUserPermissions = () => {
    queryClient.invalidateQueries({ queryKey: qk.userPermissions(user.id) });
    queryClient.invalidateQueries({ queryKey: qk.userEffectivePermissions(user.id) });
    onRefreshEffective?.();
  };

  const grantDirectPerm = useMutation({
    mutationFn: () => roleOtp.runWithOtp((otp) => apiModel.grantPermission(user.id, permPayload!, otp)),
    onSuccess: (granted) => {
      updateDraft(EMPTY_DIRECT_PERM_DRAFT);
      const meta = permByKey.get(granted.permissionKey);
      const label = meta ? permissionTitle(meta) : granted.permissionKey;
      setSectionNotice(`Đã cấp quyền trực tiếp "${label}" cho ${user.email}.`);
      invalidateUserPermissions();
    },
  });

  const revokeDirectPerm = useMutation({
    mutationFn: (perm: UserPermission) =>
      roleOtp.runWithOtp((otp) =>
        apiModel.revokePermission(
          user.id,
          perm.permissionId,
          {
            scope: perm.scope,
            clubId: perm.clubId,
            departmentId: perm.departmentId,
          },
          otp
        )
      ),
    onSuccess: (_, perm) => {
      const meta = permByKey.get(perm.permissionKey);
      const label = meta ? permissionTitle(meta) : perm.permissionKey;
      setSectionNotice(`Đã thu hồi quyền trực tiếp "${label}" của ${user.email}.`);
      invalidateUserPermissions();
    },
  });

  return (
    <>
      {sectionNotice && <Notice tone="success">{sectionNotice}</Notice>}
      <Section title="Quyền trực tiếp" icon={<KeyRound />}>
        {detailPermissions.isPending ? (
          <LoadingRows rows={2} />
        ) : detailPermissions.isError ? (
          <ErrorState message={describeError(detailPermissions.error)} />
        ) : !detailPermissions.data.length ? (
          <p className="text-sm text-muted-foreground">Chưa có quyền lẻ nào được cấp trực tiếp.</p>
        ) : (
          <ul className="grid gap-2">
            {detailPermissions.data.map((p) => {
              const meta = permByKey.get(p.permissionKey);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-xs font-bold text-foreground">
                        {meta ? permissionTitle(meta) : p.permissionKey}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-primary">
                        {p.permissionKey}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {assignmentTarget(p)} · từ {formatDay(p.grantedAt)}
                    </p>
                  </div>
                  {canRevoke && (
                    <button
                      type="button"
                      aria-label="Thu hồi quyền trực tiếp"
                      onClick={() => {
                        const label = meta ? permissionTitle(meta) : p.permissionKey;
                        if (confirm(`Thu hồi quyền trực tiếp "${label}" của ${user.email}?`)) {
                          setSectionNotice("");
                          revokeDirectPerm.mutate(p);
                        }
                      }}
                      disabled={revokeDirectPerm.isPending}
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {sectionNotice && (
          <p
            role="status"
            className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-medium text-slate-900"
          >
            {sectionNotice}
          </p>
        )}
        {revokeDirectPerm.error && (
          <p className="mt-2 text-xs text-destructive">{describeError(revokeDirectPerm.error)}</p>
        )}
        {canAssign && (
          <div className="mt-3 grid gap-2.5 rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Cấp quyền trực tiếp mới
            </p>
            <FormField
              label="Quyền nghiệp vụ"
              required
              hint={
                selectedPerm
                  ? `${permissionDesc(selectedPerm)} · Mã kỹ thuật: ${selectedPerm.permissionKey} (${scopeLabel(selectedPerm.scope)})`
                  : "Khi chọn quyền, các trường Phạm vi áp dụng, Câu lạc bộ và Ban bên dưới sẽ tự động điều chỉnh theo phạm vi của quyền đó."
              }
            >
              <Select
                value={activeDraft.permissionId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  const found = allPermissions.find((item) => item.id === nextId);
                  const nextScope = resolveNextPermScope(activeDraft.scope, found?.scope);
                  const needsClub = nextScope === "CLUB" || nextScope === "DEPARTMENT";
                  const fallbackClubId = clubs.length === 1 ? clubs[0]!.id : "";
                  setSectionNotice("");
                  updateDraft({
                    ...activeDraft,
                    permissionId: nextId,
                    scope: nextScope,
                    clubId: needsClub ? activeDraft.clubId || fallbackClubId : "",
                    departmentId: nextScope === "DEPARTMENT" ? activeDraft.departmentId : "",
                  });
                }}
              >
                <option value="">-- Chọn quyền cần cấp --</option>
                {activeGroups.map((group) => (
                  <optgroup key={group.module} label={moduleLabel(group.module)}>
                    {group.permissions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {permissionTitle(item)} ({scopeLabel(item.scope)}) — {permissionDesc(item)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </FormField>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <FormField label="Phạm vi áp dụng" required>
                <Select
                  value={activeDraft.scope}
                  onChange={(e) => {
                    const nextScope = e.target.value as Scope;
                    const keepClub = nextScope === "CLUB" || nextScope === "DEPARTMENT";
                    updateDraft({
                      ...activeDraft,
                      scope: nextScope,
                      clubId: keepClub ? activeDraft.clubId : "",
                      departmentId: nextScope === "DEPARTMENT" ? activeDraft.departmentId : "",
                    });
                  }}
                >
                  <option value="GLOBAL">Toàn hệ thống (GLOBAL)</option>
                  <option value="CLUB" disabled={selectedPerm?.scope === "GLOBAL"}>
                    Theo CLB (CLUB)
                  </option>
                  <option
                    value="DEPARTMENT"
                    disabled={selectedPerm?.scope === "GLOBAL" || selectedPerm?.scope === "CLUB"}
                  >
                    Theo Ban (DEPARTMENT)
                  </option>
                </Select>
              </FormField>

              {(activeDraft.scope === "CLUB" || activeDraft.scope === "DEPARTMENT") && (
                <FormField label="Câu lạc bộ" required>
                  <Select
                    value={activeDraft.clubId}
                    onChange={(e) =>
                      updateDraft({
                        ...activeDraft,
                        clubId: e.target.value,
                        departmentId: "",
                      })
                    }
                  >
                    <option value="">-- Chọn CLB --</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}
            </div>

            {activeDraft.scope === "DEPARTMENT" && (
              <FormField label="Ban chuyên môn" required>
                <Select
                  value={activeDraft.departmentId}
                  disabled={!activeDraft.clubId}
                  onChange={(e) => updateDraft({ ...activeDraft, departmentId: e.target.value })}
                >
                  <option value="">{activeDraft.clubId ? "-- Chọn ban chuyên môn --" : "Chọn CLB trước"}</option>
                  {activeDraft.clubId && (
                    <option value={ALL_DEPARTMENTS_VALUE}>Toàn CLB (áp dụng cho mọi ban)</option>
                  )}
                  {(permDepartments.data?.items ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}

            <FormField label="Lý do cấp quyền (audit)">
              <Input
                maxLength={500}
                value={activeDraft.reason}
                onChange={(e) => updateDraft({ ...activeDraft, reason: e.target.value })}
                placeholder="VD: Phân quyền phụ trách duyệt đơn tuyển thành viên"
              />
            </FormField>
            <Button
              size="sm"
              className="justify-self-start"
              disabled={!permPayload || grantDirectPerm.isPending}
              onClick={() => {
                setSectionNotice("");
                grantDirectPerm.mutate();
              }}
            >
              <Plus size={14} /> {grantDirectPerm.isPending ? "Đang cấp…" : "Cấp quyền trực tiếp"}
            </Button>
            {grantDirectPerm.error && (
              <p className="text-xs text-destructive">{describeError(grantDirectPerm.error)}</p>
            )}
          </div>
        )}
      </Section>

      <Section title="Quyền hiệu lực tổng hợp" icon={<Sparkles />}>
        {detailEffective.isPending ? (
          <LoadingRows rows={2} />
        ) : detailEffective.isError ? (
          <ErrorState message={describeError(detailEffective.error)} />
        ) : !detailEffective.data.length ? (
          <p className="text-sm text-muted-foreground">Tài khoản hiện chưa có quyền hiệu lực nào.</p>
        ) : (
          <div className="max-h-56 divide-y divide-border/50 overflow-y-auto rounded-lg border border-border/60">
            {detailEffective.data.map((ep, idx) => {
              const meta = permByKey.get(ep.permissionKey);
              return (
                <div
                  key={`${ep.permissionKey}-${ep.scope}-${ep.clubId || ""}-${ep.departmentId || ""}-${ep.source}-${ep.roleCode || ""}-${idx}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-bold text-foreground">
                        {meta ? permissionTitle(meta) : ep.permissionKey}
                      </span>
                      <span className="font-mono text-[10.5px] text-muted-foreground">
                        {ep.permissionKey}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{assignmentTarget(ep)}</p>
                  </div>
                  <Badge tone={ep.source === "DIRECT" ? "primary" : "neutral"}>
                    {ep.source === "DIRECT" ? "Trực tiếp" : `Vai trò: ${ep.roleCode}`}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Section>
      <Otp2FaChallengeModal {...roleOtp.otpModalProps} />
    </>
  );
}
