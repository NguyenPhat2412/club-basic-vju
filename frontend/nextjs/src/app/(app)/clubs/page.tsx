"use client";
import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Compass, Eye, Mail, Send } from "lucide-react";
import { apiModel, Club } from "@/lib/api";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

const LIMIT = 20;

export default function ClubsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Club | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  const clubs = useQuery({ queryKey: ["clubs", search, offset], queryFn: () => apiModel.clubs(search, "", offset, LIMIT), placeholderData: keepPreviousData });
  const apply = useMutation({
    mutationFn: () => apiModel.apply(selected!.id, message),
    onSuccess: () => {
      setNotice(`Đã gửi đơn đăng ký vào ${selected!.name}. Theo dõi tại "Đơn đăng ký của tôi".`);
      setMessage(""); setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });

  const open = (club: Club) => { setSelected(club); setMessage(""); apply.reset(); };

  return (
    <ListPage title="Khám phá CLB">
      <BreadcrumbToolbar crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Câu lạc bộ" }, { label: "Khám phá CLB" }]}
        titleBadge={<CountBadge>{clubs.data?.total ?? 0}</CountBadge>}
        search={{ value: search, onChange: (v) => { setSearch(v); setOffset(0); }, placeholder: "Tìm theo tên, mã CLB…" }}
        onRefresh={() => clubs.refetch()} />
      {notice && <Notice tone="success">{notice}</Notice>}
      {clubs.isPending ? <LoadingRows /> : clubs.isError ? <ErrorState message={describeError(clubs.error)} onRetry={() => clubs.refetch()} />
        : !clubs.data.items.length ? <EmptyState icon={<Compass />} title="Không tìm thấy CLB" description="Thử từ khoá khác." />
          : <DataTable ariaLabel="Danh sách CLB" rows={clubs.data.items} rowKey={(c) => c.id} onRowClick={open} columns={[
            { key: "code", header: "Mã CLB", render: (c) => <span className="font-mono font-semibold text-primary">{c.code}</span> },
            { key: "name", header: "Tên CLB", render: (c) => (
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">{c.name.slice(0, 1)}</span>
                <div className="min-w-0"><p className="max-w-72 truncate font-bold">{c.name}</p><p className="max-w-72 truncate text-[10.5px] text-muted-foreground">{c.description || "—"}</p></div>
              </div>) },
            { key: "field", header: "Lĩnh vực", render: (c) => <span className="font-medium text-primary">{c.activityField || "—"}</span> },
            { key: "contact", header: "Liên hệ", render: (c) => <span className="font-mono text-muted-foreground">{c.contactEmail || "—"}</span> },
            { key: "status", header: "Trạng thái", render: (c) => <StatusBadge status={c.status} /> },
            { key: "actions", header: "Thao tác", className: "text-right", render: (c) => <TableRowActions actions={[
              { icon: <Eye />, label: "Xem chi tiết", onClick: () => open(c) },
              { icon: <Send />, label: "Gửi đơn đăng ký", onClick: () => open(c), disabled: c.status !== "ACTIVE" },
            ]} /> },
          ]} />}
      {clubs.data && <Pagination offset={offset} limit={LIMIT} total={clubs.data.total} onOffset={setOffset} />}

      <EntityDrawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ""} subtitle={selected?.code} icon={<Compass />}>
        {selected && <>
          <DetailList rows={[
            ["Mã CLB", <span key="c" className="font-mono font-semibold text-primary">{selected.code}</span>],
            ["Trạng thái", <StatusBadge key="s" status={selected.status} />],
            ["Lĩnh vực", selected.activityField || "—"],
            ["Liên hệ", selected.contactEmail ? <a key="m" className="inline-flex items-center gap-1 text-primary hover:underline" href={`mailto:${selected.contactEmail}`}><Mail size={13} />{selected.contactEmail}</a> : "—"],
            ["Giới thiệu", <p key="d" className="whitespace-pre-line text-muted-foreground">{selected.description || "CLB đang cập nhật giới thiệu."}</p>],
          ]} />
          <Section title="Gửi đơn đăng ký" icon={<Send />}>
            {selected.status !== "ACTIVE" ? <p className="text-xs text-muted-foreground">CLB đang tạm ngừng nhận thành viên.</p> : <>
              <Textarea maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Chia sẻ lý do bạn muốn tham gia…" aria-label="Lời nhắn" />
              {apply.error && <p className="text-xs text-destructive">{describeError(apply.error)}</p>}
              <Button className="justify-self-end text-xs font-bold" disabled={!message.trim() || apply.isPending} onClick={() => apply.mutate()}>
                <Send size={14} /> {apply.isPending ? "Đang gửi…" : "Gửi đơn"}
              </Button>
            </>}
          </Section>
        </>}
      </EntityDrawer>
    </ListPage>
  );
}
