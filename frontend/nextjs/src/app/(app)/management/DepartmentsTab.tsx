"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Lock, LockOpen, Pencil, Plus } from "lucide-react";
import { apiModel, Department } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DataTable } from "@/components/shared/DataTable";
import { ModalShell } from "@/components/shared/Overlays";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { RowAction, TableRowActions } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/input";

export function DepartmentsTab({
  clubId,
  onNotice,
  onError,
}: {
  clubId: string;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const canCreate = session.canInClub("department.create", clubId);
  const departments = useQuery({
    queryKey: ["departments", clubId],
    queryFn: () => apiModel.departments(clubId),
    enabled: !!clubId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["departments", clubId] });
  };

  const create = useMutation({
    mutationFn: () => apiModel.createDepartment(clubId, { name: name.trim(), description: description.trim() || undefined }),
    onSuccess: (dept) => {
      onNotice(`Đã tạo ban "${dept.name}".`);
      onError("");
      setCreating(false);
      setName("");
      setDescription("");
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const update = useMutation({
    mutationFn: () => apiModel.updateDepartment(editing!.id, { name: name.trim(), description: description.trim() || undefined }),
    onSuccess: (dept) => {
      onNotice(`Đã cập nhật thông tin ban "${dept.name}".`);
      onError("");
      setEditing(null);
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) => apiModel.updateDepartmentStatus(id, status),
    onSuccess: (dept) => {
      onNotice(dept.status === "ACTIVE" ? `Đã kích hoạt ban "${dept.name}".` : `Đã ngừng hoạt động ban "${dept.name}".`);
      onError("");
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setName(dept.name);
    setDescription(dept.description ?? "");
    update.reset();
  };

  const actionsFor = (dept: Department): RowAction[] => {
    const canEdit = session.canInDepartment("department.update", clubId, dept.id);
    const canActivate = dept.status !== "ACTIVE" && session.canInDepartment("department.activate", clubId, dept.id);
    const canDeactivate = dept.status === "ACTIVE" && session.canInDepartment("department.inactive", clubId, dept.id);
    return [
      ...(canEdit ? [{ icon: <Pencil />, label: "Sửa thông tin", onClick: () => openEdit(dept) }] : []),
      ...(canActivate
        ? [{ icon: <LockOpen />, label: "Kích hoạt ban", onClick: () => toggleStatus.mutate({ id: dept.id, status: "ACTIVE" }) }]
        : []),
      ...(canDeactivate
        ? [{ icon: <Lock />, label: "Ngừng hoạt động", danger: true, onClick: () => toggleStatus.mutate({ id: dept.id, status: "INACTIVE" }) }]
        : []),
    ];
  };

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end px-4 pt-2">
          <Button size="sm" onClick={() => { setCreating(true); setName(""); setDescription(""); create.reset(); }}>
            <Plus size={14} /> Tạo ban chuyên môn
          </Button>
        </div>
      )}

      {departments.isPending ? (
        <LoadingRows />
      ) : departments.isError ? (
        <ErrorState message={describeError(departments.error)} onRetry={() => departments.refetch()} />
      ) : !departments.data.items.length ? (
        <EmptyState
          icon={<Building2 />}
          title="CLB chưa có ban chuyên môn nào"
          actionLabel={canCreate ? "Tạo ban chuyên môn" : undefined}
          onAction={canCreate ? () => { setCreating(true); setName(""); setDescription(""); } : undefined}
        />
      ) : (
        <DataTable
          ariaLabel="Ban chuyên môn"
          rows={departments.data.items}
          rowKey={(d) => d.id}
          onRowClick={(d) => session.canInDepartment("department.update", clubId, d.id) && openEdit(d)}
          columns={[
            { key: "name", header: "Tên ban chuyên môn", render: (d) => <span className="font-bold text-foreground">{d.name}</span> },
            { key: "desc", header: "Mô tả nhiệm vụ", className: "max-w-[440px]", render: (d) => <p className="truncate text-muted-foreground">{d.description || "—"}</p> },
            { key: "status", header: "Trạng thái", render: (d) => <StatusBadge status={d.status} /> },
            {
              key: "actions",
              header: "Thao tác",
              className: "text-right",
              render: (d) => {
                const acts = actionsFor(d);
                return acts.length ? <TableRowActions actions={acts} /> : <span className="text-xs text-muted-foreground">—</span>;
              },
            },
          ]}
        />
      )}

      <ModalShell
        open={creating}
        onClose={() => setCreating(false)}
        title="Tạo ban chuyên môn"
        icon={<Building2 />}
        onSubmit={() => create.mutate()}
        submitLabel="Tạo ban"
        submitLoading={create.isPending}
        submitDisabled={!name.trim()}
      >
        <FormField label="Tên ban chuyên môn" required>
          <Input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Ban Truyền thông, Ban Chuyên môn, Ban Sự kiện…" />
        </FormField>
        <FormField label="Mô tả chức năng">
          <Textarea value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả ngắn gọn nhiệm vụ của ban…" />
        </FormField>
      </ModalShell>

      <ModalShell
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Cập nhật ban chuyên môn"
        icon={<Pencil />}
        onSubmit={() => update.mutate()}
        submitLabel="Lưu thay đổi"
        submitLoading={update.isPending}
        submitDisabled={!name.trim()}
      >
        <FormField label="Tên ban chuyên môn" required>
          <Input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Mô tả chức năng">
          <Textarea value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
      </ModalShell>
    </div>
  );
}
