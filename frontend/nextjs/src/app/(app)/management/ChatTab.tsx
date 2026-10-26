"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Hash, MessageSquare, Plus, Send, Sparkles } from "lucide-react";
import { apiModel, Department } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { ModalShell } from "@/components/shared/Overlays";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { cn, formatDateTime } from "@/lib/utils";

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  CLUB_GENERAL: "Kênh chung CLB",
  DEPARTMENT: "Kênh theo Ban",
  EVENT_THREAD: "Thảo luận Sự kiện",
};

export function ChatTab({
  clubId,
  departments,
  onNotice,
  onError,
}: {
  clubId: string;
  departments: Department[];
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [channelId, setChannelId] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("CLUB_GENERAL");
  const [newDeptId, setNewDeptId] = useState("");
  const [content, setContent] = useState("");

  const canSend = session.canInClub("chat.send", clubId);
  const canSummarize = session.canInClub("chat.summarize", clubId);

  const channels = useQuery({
    queryKey: ["club-channels", clubId],
    queryFn: () => apiModel.clubChannels(clubId),
    enabled: !!clubId,
  });

  const activeChannel = (channels.data ?? []).find((c) => c.id === channelId) ?? channels.data?.[0];
  const activeChannelId = activeChannel?.id ?? "";

  const messages = useQuery({
    queryKey: ["channel-messages", activeChannelId],
    queryFn: () => apiModel.channelMessages(activeChannelId),
    enabled: !!activeChannelId,
  });

  const summaries = useQuery({
    queryKey: ["channel-summaries", activeChannelId],
    queryFn: () => apiModel.channelSummaries(activeChannelId),
    enabled: !!activeChannelId,
  });

  const createChannel = useMutation({
    mutationFn: () =>
      apiModel.createChannel(clubId, {
        name: newName.trim(),
        channelType: newType,
        departmentId: newType === "DEPARTMENT" && newDeptId ? newDeptId : undefined,
      }),
    onSuccess: (ch) => {
      onNotice(`Đã tạo kênh trao đổi "${ch.name}".`);
      onError("");
      setCreating(false);
      setNewName("");
      setChannelId(ch.id);
      queryClient.invalidateQueries({ queryKey: ["club-channels", clubId] });
    },
    onError: (e) => onError(describeError(e)),
  });

  const sendMessage = useMutation({
    mutationFn: () => apiModel.sendMessage(activeChannelId, content.trim()),
    onSuccess: () => {
      setContent("");
      onError("");
      queryClient.invalidateQueries({ queryKey: ["channel-messages", activeChannelId] });
    },
    onError: (e) => onError(describeError(e)),
  });

  const summarize = useMutation({
    mutationFn: () => apiModel.summarizeChannel(activeChannelId, { messageLimit: 50, postToChannel: true }),
    onSuccess: () => {
      onNotice("Trợ lý AI đã tóm tắt nội dung thảo luận của kênh.");
      onError("");
      queryClient.invalidateQueries({ queryKey: ["channel-messages", activeChannelId] });
      queryClient.invalidateQueries({ queryKey: ["channel-summaries", activeChannelId] });
    },
    onError: (e) => onError(describeError(e)),
  });

  if (channels.isPending) return <LoadingRows />;
  if (channels.isError) return <ErrorState message={describeError(channels.error)} onRetry={() => channels.refetch()} />;

  const orderedMessages = [...(messages.data?.items ?? [])].reverse();
  const latestSummary = summaries.data?.[0];

  return (
    <div className="p-4">
      {!channels.data.length ? (
        <EmptyState
          icon={<MessageSquare />}
          title="CLB chưa có kênh trao đổi nội bộ"
          actionLabel={canSend ? "Tạo kênh trao đổi đầu tiên" : undefined}
          onAction={canSend ? () => setCreating(true) : undefined}
        />
      ) : (
        <div className="grid min-h-[520px] gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between pb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kênh thảo luận</p>
                {canSend && (
                  <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
                    <Plus size={13} /> Tạo kênh
                  </Button>
                )}
              </div>
              {channels.data.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setChannelId(ch.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors",
                    ch.id === activeChannelId ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted"
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Hash size={13} /> {ch.name}
                  </span>
                  {ch.departmentName && <span className="truncate text-[10px] text-muted-foreground">{ch.departmentName}</span>}
                </button>
              ))}
            </div>
          </aside>

          <section className="flex flex-col rounded-xl border border-border/60 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
              <div>
                <h3 className="text-sm font-bold"># {activeChannel?.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {activeChannel ? CHANNEL_TYPE_LABELS[activeChannel.channelType] ?? activeChannel.channelType : ""}
                  {activeChannel?.departmentName ? ` · ${activeChannel.departmentName}` : ""}
                </p>
              </div>
              {canSummarize && (
                <Button size="sm" variant="outline" disabled={summarize.isPending || !orderedMessages.length} onClick={() => summarize.mutate()}>
                  <Sparkles size={14} /> {summarize.isPending ? "Đang tóm tắt…" : "Tóm tắt thảo luận bằng AI"}
                </Button>
              )}
            </div>

            {latestSummary && (
              <div className="border-b border-primary/15 bg-primary/5 px-4 py-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-primary">
                  <Bot size={14} /> Bản tóm tắt AI gần nhất ({formatDateTime(latestSummary.createdAt)})
                </div>
                <p className="mt-1 whitespace-pre-line text-foreground">{latestSummary.summary}</p>
                {latestSummary.decisions?.length > 0 && (
                  <p className="mt-1 text-muted-foreground"><b>Quyết định:</b> {latestSummary.decisions.join(" · ")}</p>
                )}
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[380px]">
              {messages.isPending ? (
                <LoadingRows rows={3} />
              ) : !orderedMessages.length ? (
                <p className="py-8 text-center text-xs text-muted-foreground">Chưa có tin nhắn nào trong kênh này.</p>
              ) : (
                orderedMessages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-lg border px-3.5 py-2.5 text-xs",
                      m.senderType === "AI_BOT" ? "border-primary/25 bg-primary/5" : "border-border/60 bg-background"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground">
                        {m.senderType === "AI_BOT" ? "Trợ lý AI CLB" : m.senderFullName || "Thành viên"}
                      </span>
                      <div className="flex items-center gap-2">
                        {m.senderType === "AI_BOT" && <Badge tone="primary" dot={false}>AI</Badge>}
                        <span className="font-mono text-[10px] text-muted-foreground">{formatDateTime(m.createdAt)}</span>
                      </div>
                    </div>
                    <p className="mt-1.5 whitespace-pre-line leading-relaxed text-foreground">{m.content}</p>
                  </div>
                ))
              )}
            </div>

            {canSend && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (content.trim() && !sendMessage.isPending) sendMessage.mutate();
                }}
                className="flex gap-2 border-t border-border/60 p-3"
              >
                <Input
                  value={content}
                  maxLength={4000}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập nội dung trao đổi trong kênh…"
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={!content.trim() || sendMessage.isPending}>
                  <Send size={14} /> Gửi
                </Button>
              </form>
            )}
          </section>
        </div>
      )}

      <ModalShell
        open={creating}
        onClose={() => setCreating(false)}
        title="Tạo kênh trao đổi mới"
        icon={<MessageSquare />}
        onSubmit={() => createChannel.mutate()}
        submitLabel="Tạo kênh"
        submitLoading={createChannel.isPending}
        submitDisabled={!newName.trim() || (newType === "DEPARTMENT" && !newDeptId)}
      >
        <FormField label="Tên kênh" required>
          <Input value={newName} maxLength={160} onChange={(e) => setNewName(e.target.value)} placeholder="Ví dụ: thong-bao-chung, ban-truyen-thong…" />
        </FormField>
        <FormField label="Loại kênh">
          <Select value={newType} onChange={(e) => setNewType(e.target.value)}>
            <option value="CLUB_GENERAL">Kênh chung toàn CLB</option>
            <option value="DEPARTMENT">Kênh riêng theo Ban</option>
          </Select>
        </FormField>
        {newType === "DEPARTMENT" && (
          <FormField label="Chọn Ban" required>
            <Select value={newDeptId} onChange={(e) => setNewDeptId(e.target.value)}>
              <option value="">Chọn ban…</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </FormField>
        )}
      </ModalShell>
    </div>
  );
}
