"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, MessageSquare, Plus } from "lucide-react";
import { apiModel, ChatChannel, ChatMessage, Department } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useChannelMessages, useClubChannels, useClubQuickReplies } from "@/hooks/chat/useClubChat";
import { useChatMessageSender } from "@/hooks/chat/useChatMessageSender";
import { useChatRealtime } from "@/hooks/chat/useChatRealtime";
import { DocumentPreviewModal, PreviewTarget } from "@/components/document/DocumentPreviewModal";
import { ChatDocumentPickerModal } from "@/components/management/ChatDocumentPickerModal";
import { ChatMessagePane } from "@/components/management/ChatMessagePane";
import { ModalShell } from "@/components/shared/Overlays";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { FormField, Input, Select } from "@/components/ui/input";
import { cn, saveBlob } from "@/lib/utils";

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
  const [pickingDoc, setPickingDoc] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  const [olderByChannel, setOlderByChannel] = useState<Record<string, ChatMessage[]>>({});
  const [exhaustedChannels, setExhaustedChannels] = useState<Record<string, boolean>>({});
  const [loadingOlder, setLoadingOlder] = useState(false);

  const canSend = session.canInClub("chat.send", clubId);
  const canSummarize = session.canInClub("chat.summarize", clubId);
  const canViewClubDocs = session.canInClub("document.view", clubId);
  const canCreateChannel =
    session.canInClub("club.update", clubId) ||
    session.canInClub("department.create", clubId) ||
    session.canInClub("department.update", clubId) ||
    session.canInClub("event.create", clubId);

  const channels = useClubChannels(clubId, Boolean(clubId));
  const quickReplies = useClubQuickReplies(clubId, Boolean(clubId));
  const activeChannel = (channels.data ?? []).find((c) => c.id === channelId) ?? channels.data?.[0];
  const activeChannelId = activeChannel?.id ?? "";

  const composer = useChatMessageSender({
    activeChannelId,
    userId: session.user?.id,
    userFullName: session.user?.fullName,
    onError,
  });

  const { status: wsStatus, wsError, typingUsers, sendTyping } = useChatRealtime({
    clubId,
    activeChannelId,
    currentUserId: session.user?.id,
    enabled: !!activeChannelId && session.ready,
  });

  const messages = useChannelMessages(activeChannelId, 50, Boolean(activeChannelId), session.user?.id);

  const summaries = useQuery({
    queryKey: ["channel-summaries", activeChannelId],
    queryFn: () => apiModel.channelSummaries(activeChannelId),
    enabled: !!activeChannelId,
  });

  useEffect(() => {
    if (!activeChannelId || !activeChannel?.unreadCount) return;
    const newestId = messages.data?.items?.find((m) => !m.optimistic)?.id;
    apiModel.markChannelRead(activeChannelId, newestId).catch(() => {});
    queryClient.setQueryData<ChatChannel[]>(["club-channels", clubId], (old) =>
      old?.map((ch) => (ch.id === activeChannelId ? { ...ch, unreadCount: 0 } : ch))
    );
  }, [activeChannelId, activeChannel?.unreadCount, clubId, messages.data?.items, queryClient]);

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

  const primaryDesc = messages.data?.items ?? [];
  const extraOlder = olderByChannel[activeChannelId] ?? [];
  const seenIds = new Set(primaryDesc.map((m) => m.id));
  const mergedDesc = [...primaryDesc, ...extraOlder.filter((m) => !seenIds.has(m.id))];
  const orderedMessages = [...mergedDesc].reverse();
  const hasOlder =
    !exhaustedChannels[activeChannelId] &&
    mergedDesc.length > 0 &&
    mergedDesc.length < (messages.data?.total ?? 0);

  const loadOlder = async () => {
    const oldest = mergedDesc.filter((m) => !m.optimistic).at(-1);
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await apiModel.channelMessages(activeChannelId, 0, 30, oldest.id);
      if (!page.items.length) {
        setExhaustedChannels((prev) => ({ ...prev, [activeChannelId]: true }));
      } else {
        setOlderByChannel((prev) => ({
          ...prev,
          [activeChannelId]: [...(prev[activeChannelId] ?? []), ...page.items],
        }));
        if (page.items.length < 30) {
          setExhaustedChannels((prev) => ({ ...prev, [activeChannelId]: true }));
        }
      }
    } catch (e) {
      onError(describeError(e));
    } finally {
      setLoadingOlder(false);
    }
  };

  const downloadDoc = async (id: string, name: string) => {
    try {
      saveBlob(await apiModel.downloadDocument(id), name);
    } catch (e) {
      onError(describeError(e));
    }
  };

  return (
    <div className="p-2.5 sm:p-3">
      {!channels.data.length ? (
        <EmptyState
          icon={<MessageSquare />}
          title="CLB chưa có kênh trao đổi nội bộ"
          actionLabel={canCreateChannel ? "Tạo kênh trao đổi đầu tiên" : undefined}
          onAction={canCreateChannel ? () => setCreating(true) : undefined}
        />
      ) : (
        <div className="grid h-[calc(100vh-215px)] max-h-[760px] min-h-[500px] overflow-hidden rounded-xl border border-border/60 bg-card lg:grid-cols-[224px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b border-border/60 bg-muted/[0.18] lg:border-r lg:border-b-0">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Kênh ({channels.data.length})
              </span>
              {canCreateChannel && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  aria-label="Tạo kênh mới"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background px-2 text-[11px] font-semibold text-foreground hover:bg-muted"
                >
                  <Plus size={12} /> Tạo kênh
                </button>
              )}
            </div>

            <div className="flex gap-1 overflow-x-auto p-2 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
              {channels.data.map((ch) => {
                const active = ch.id === activeChannelId;
                const unread = (ch.unreadCount ?? 0) > 0 && !active;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => {
                      if (active) return;
                      setChannelId(ch.id);
                      composer.resetComposerAttachments();
                    }}
                    className={cn(
                      "flex shrink-0 flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors lg:w-full",
                      active
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-foreground/85 hover:bg-muted/70"
                    )}
                  >
                    <span className="flex w-full min-w-0 items-center justify-between gap-1.5">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Hash size={13} className="shrink-0 opacity-75" />
                        <span className="max-w-[140px] truncate lg:max-w-none">{ch.name}</span>
                      </span>
                      {unread && (
                        <span className="grid min-w-4 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">
                          {ch.unreadCount! > 99 ? "99+" : ch.unreadCount}
                        </span>
                      )}
                    </span>
                    {ch.departmentName && (
                      <span className="hidden w-full truncate pl-5 text-[10.5px] font-normal text-muted-foreground lg:block">
                        {ch.departmentName}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          <ChatMessagePane
            clubId={clubId}
            activeChannel={activeChannel}
            currentUserId={session.user?.id}
            wsStatus={wsStatus}
            wsError={wsError}
            canSend={canSend}
            canSummarize={canSummarize}
            canManageQuickReplies={canCreateChannel || canSummarize}
            quickReplies={quickReplies.data ?? []}
            quickRepliesLoading={quickReplies.isPending}
            summarizePending={summarize.isPending}
            onSummarize={() => summarize.mutate()}
            latestSummary={summaries.data?.[0]}
            messagesPending={messages.isPending}
            messagesError={messages.isError ? messages.error : null}
            onRetryMessages={() => messages.refetch()}
            orderedMessages={orderedMessages}
            hasOlder={hasOlder}
            loadingOlder={loadingOlder}
            onLoadOlder={loadOlder}
            typingUsers={typingUsers}
            replyTo={composer.replyTo}
            onReply={composer.setReplyTo}
            onClearReply={() => composer.setReplyTo(null)}
            attachedDoc={composer.attachedDoc}
            onOpenDocPicker={() => setPickingDoc(true)}
            onClearAttachedDoc={() => composer.setAttachedDoc(null)}
            stagedMedia={composer.stagedMedia}
            onAddFiles={composer.handleAddFiles}
            onRemoveStagedMedia={composer.handleRemoveStagedMedia}
            onClearStagedMedia={composer.handleClearStagedMedia}
            content={composer.content}
            onContentChange={(val) => {
              composer.setContent(val);
              if (val.trim()) sendTyping();
            }}
            sendPending={composer.sendPending}
            onSend={composer.handleDispatchSend}
            onPreviewDoc={setPreviewTarget}
            onDownloadDoc={downloadDoc}
            onNotice={onNotice}
            onError={onError}
          />
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
          <Input
            value={newName}
            maxLength={160}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ví dụ: thong-bao-chung, ban-truyen-thong…"
          />
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
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}
      </ModalShell>

      <ChatDocumentPickerModal
        open={pickingDoc}
        clubId={clubId}
        canViewClubDocs={canViewClubDocs}
        onClose={() => setPickingDoc(false)}
        onSelect={composer.setAttachedDoc}
      />

      <DocumentPreviewModal
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
        onDownload={(t) => downloadDoc(t.id, t.name)}
      />
    </div>
  );
}
