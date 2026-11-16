"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, MessageSquare, Plus } from "lucide-react";
import { apiModel, ChatChannel, ChatMessage, Department } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { setActiveViewedChatChannel, UNREAD_SUMMARY_QUERY_KEY } from "@/hooks/notification/useGlobalRealtimeNotifications";
import { useChannelMessages, useChannelPinnedMessages, useClubChannels, useClubQuickReplies, useWarmClubChannels } from "@/hooks/chat/useClubChat";
import { useChatMessageActions } from "@/hooks/chat/useChatMessageActions";
import { useChatMessageSender } from "@/hooks/chat/useChatMessageSender";
import { useChatRealtime } from "@/hooks/chat/useChatRealtime";
import { filterChannelMessages } from "@/lib/chat-message-cache";
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
  const urlChannelId = useSearchParams().get("channelId") ?? "";
  const [channelId, setChannelId] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("CLUB_GENERAL");
  const [newDeptId, setNewDeptId] = useState("");
  const [pickingDoc, setPickingDoc] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  const [olderByChannel, setOlderByChannel] = useState<Record<string, ChatMessage[]>>({});
  const [exhaustedChannels, setExhaustedChannels] = useState<Record<string, boolean>>({});
  const [loadingOlderByChannel, setLoadingOlderByChannel] = useState<Record<string, boolean>>({});

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
  const preferredChannelId = channelId || urlChannelId;
  const activeChannel = (channels.data ?? []).find((c) => c.id === preferredChannelId) ?? channels.data?.[0];
  const activeChannelId = activeChannel?.id ?? "";
  const userId = session.user?.id;

  useEffect(() => {
    setActiveViewedChatChannel(activeChannelId || null);
    return () => setActiveViewedChatChannel(null);
  }, [activeChannelId]);

  const { warmChannel } = useWarmClubChannels(channels.data, activeChannelId, userId, 50);

  const composer = useChatMessageSender({
    activeChannelId,
    userId,
    userFullName: session.user?.fullName,
    onError,
  });

  const { status: wsStatus, wsError, typingUsers, sendTyping } = useChatRealtime({
    clubId,
    activeChannelId,
    currentUserId: userId,
    enabled: !!activeChannelId && session.ready,
  });

  const messages = useChannelMessages(activeChannelId, 50, Boolean(activeChannelId), userId);
  const pinnedQuery = useChannelPinnedMessages(activeChannelId, Boolean(activeChannelId), userId);

  const summaries = useQuery({
    queryKey: ["channel-summaries", activeChannelId],
    queryFn: () => apiModel.channelSummaries(activeChannelId),
    staleTime: 25_000,
    enabled: !!activeChannelId,
  });

  useEffect(() => {
    if (!activeChannelId || !activeChannel?.unreadCount) return;
    const newestId = filterChannelMessages(messages.data?.items, activeChannelId).find((m) => !m.optimistic)?.id;
    apiModel
      .markChannelRead(activeChannelId, newestId)
      .then(() => queryClient.invalidateQueries({ queryKey: UNREAD_SUMMARY_QUERY_KEY }))
      .catch(() => {});
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
    mutationFn: (targetChId: string) =>
      apiModel.summarizeChannel(targetChId, { messageLimit: 50, postToChannel: true }),
    onSuccess: (_res, targetChId) => {
      onNotice("Trợ lý AI đã tóm tắt nội dung thảo luận của kênh.");
      onError("");
      queryClient.invalidateQueries({ queryKey: ["channel-messages", targetChId] });
      queryClient.invalidateQueries({ queryKey: ["channel-summaries", targetChId] });
    },
    onError: (e) => onError(describeError(e)),
  });

  const { togglePinMessage, toggleReactionMessage } = useChatMessageActions({
    queryClient,
    activeChannelId,
    userId,
    userFullName: session.user?.fullName,
    setOlderByChannel,
    onError,
  });

  if (channels.isPending) return <LoadingRows />;
  if (channels.isError) return <ErrorState message={describeError(channels.error)} onRetry={() => channels.refetch()} />;

  const primaryDesc = filterChannelMessages(messages.data?.items, activeChannelId);
  const extraOlder = filterChannelMessages(olderByChannel[activeChannelId], activeChannelId);
  const seenIds = new Set(primaryDesc.map((m) => m.id));
  const mergedDesc = [...primaryDesc, ...extraOlder.filter((m) => !seenIds.has(m.id))];
  const orderedMessages = [...mergedDesc].reverse();
  const pinnedMessages = filterChannelMessages(pinnedQuery.data, activeChannelId);
  const loadingOlder = Boolean(loadingOlderByChannel[activeChannelId]);
  const hasOlder =
    !exhaustedChannels[activeChannelId] &&
    mergedDesc.length > 0 &&
    mergedDesc.length < (messages.data?.total ?? 0);

  const loadOlder = async () => {
    const targetChId = activeChannelId;
    const oldest = mergedDesc.filter((m) => !m.optimistic).at(-1);
    if (!targetChId || !oldest || loadingOlderByChannel[targetChId]) return;
    setLoadingOlderByChannel((prev) => ({ ...prev, [targetChId]: true }));
    try {
      const page = await apiModel.channelMessages(targetChId, 0, 30, oldest.id);
      const safeItems = filterChannelMessages(page.items, targetChId);
      if (!safeItems.length) {
        setExhaustedChannels((prev) => ({ ...prev, [targetChId]: true }));
      } else {
        setOlderByChannel((prev) => ({
          ...prev,
          [targetChId]: [...(prev[targetChId] ?? []), ...safeItems],
        }));
        if (safeItems.length < 30) {
          setExhaustedChannels((prev) => ({ ...prev, [targetChId]: true }));
        }
      }
    } catch (e) {
      onError(describeError(e));
    } finally {
      setLoadingOlderByChannel((prev) => ({ ...prev, [targetChId]: false }));
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
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      {!channels.data.length ? (
        <div className="p-4">
          <EmptyState
            icon={<MessageSquare />}
            title="CLB chưa có kênh trao đổi nội bộ"
            actionLabel={canCreateChannel ? "Tạo kênh trao đổi đầu tiên" : undefined}
            onAction={canCreateChannel ? () => setCreating(true) : undefined}
          />
        </div>
      ) : (
        <div
          data-testid="chat-split-workspace"
          className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-card lg:grid lg:grid-cols-[224px_minmax(0,1fr)]"
        >
          <aside className="flex min-h-0 shrink-0 flex-col border-b border-border/60 bg-muted/[0.16] lg:h-full lg:border-r lg:border-b-0">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 px-3">
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

            <div className="flex gap-1 overflow-x-auto p-1.5 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
              {channels.data.map((ch) => {
                const active = ch.id === activeChannelId;
                const unread = (ch.unreadCount ?? 0) > 0 && !active;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onPointerEnter={() => warmChannel(ch.id)}
                    onFocus={() => warmChannel(ch.id)}
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
            currentUserId={userId}
            wsStatus={wsStatus}
            wsError={wsError}
            canSend={canSend}
            canSummarize={canSummarize}
            canManageQuickReplies={canCreateChannel || canSummarize}
            quickReplies={quickReplies.data ?? []}
            quickRepliesLoading={quickReplies.isPending}
            summarizePending={summarize.isPending}
            onSummarize={() => activeChannelId && summarize.mutate(activeChannelId)}
            latestSummary={summaries.data?.[0]}
            pinnedMessages={pinnedMessages}
            onTogglePin={(m) => togglePinMessage(m)}
            onToggleReaction={toggleReactionMessage}
            onUnpinById={(messageId) => {
              const target =
                pinnedMessages.find((m) => m.id === messageId) ??
                orderedMessages.find((m) => m.id === messageId);
              if (target) togglePinMessage(target, true);
            }}
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
            onRetryMessage={composer.handleRetryMessage}
            onDismissFailed={composer.handleDismissFailedMessage}
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
          <Input value={newName} maxLength={160} onChange={(e) => setNewName(e.target.value)} placeholder="Ví dụ: thong-bao-chung, ban-truyen-thong…" />
        </FormField>
        <FormField label="Loại kênh" required>
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

      <ChatDocumentPickerModal open={pickingDoc} clubId={clubId} canViewClubDocs={canViewClubDocs} onClose={() => setPickingDoc(false)} onSelect={composer.setAttachedDoc} />
      <DocumentPreviewModal target={previewTarget} onClose={() => setPreviewTarget(null)} onDownload={(t) => downloadDoc(t.id, t.name)} />
    </div>
  );
}
