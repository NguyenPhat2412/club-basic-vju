"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import {
  apiModel,
  ChatAttachment,
  ChatMessage,
  DocumentItem,
  Page,
  StagedChatMedia,
} from "@/lib/api";
import {
  CHAT_MAX_ATTACHMENTS,
  getCachedChannelWindow,
  reconcileIncomingChatMessage,
  saveCachedChannelWindow,
  seedChatAttachmentPreviewUrl,
  validateChatMediaFile,
} from "@/lib/chat-message-cache";
import { describeError } from "@/components/shared/ListPage";

type AsyncSendJob = {
  targetChannelId: string;
  text: string;
  replySnapshot: ChatMessage | null;
  docSnapshot: DocumentItem | null;
  stagedSnapshot: StagedChatMedia[];
  clientTempId: string;
  createdAt: string;
};

const channelCommitQueues = new Map<string, Promise<void>>();

function enqueueChannelCommit<T>(channelId: string, task: () => Promise<T>): Promise<T> {
  const prev = channelCommitQueues.get(channelId) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(task);
  const tail = next.then(() => undefined, () => undefined);
  channelCommitQueues.set(channelId, tail);
  void tail.finally(() => {
    if (channelCommitQueues.get(channelId) === tail) {
      channelCommitQueues.delete(channelId);
    }
  });
  return next;
}

export function useChatMessageSender({
  activeChannelId,
  userId,
  userFullName,
  onError,
}: {
  activeChannelId: string;
  userId?: string;
  userFullName?: string;
  onError: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const activeChannelRef = useRef(activeChannelId);
  useEffect(() => {
    activeChannelRef.current = activeChannelId;
  }, [activeChannelId]);

  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [attachedDoc, setAttachedDoc] = useState<DocumentItem | null>(null);
  const [stagedMedia, setStagedMedia] = useState<StagedChatMedia[]>([]);
  const [inFlightCount, setInFlightCount] = useState(0);
  const failedJobsRef = useRef<Map<string, AsyncSendJob>>(new Map());

  const handleAddFiles = (raw: FileList | File[]) => {
    const incoming = Array.from(raw);
    if (!incoming.length) return;
    const accepted: StagedChatMedia[] = [];
    const remaining = CHAT_MAX_ATTACHMENTS - stagedMedia.length;
    if (remaining <= 0) {
      onError(`Mỗi tin nhắn đính kèm tối đa ${CHAT_MAX_ATTACHMENTS} tệp.`);
      return;
    }
    for (const file of incoming.slice(0, remaining)) {
      const check = validateChatMediaFile(file);
      if (check.error) {
        onError(check.error);
        continue;
      }
      accepted.push({
        localId: `local-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        mediaKind: check.kind,
      });
    }
    if (accepted.length) {
      onError("");
      setStagedMedia((prev) => [...prev, ...accepted]);
    }
  };

  const handleRemoveStagedMedia = (localId: string) => {
    setStagedMedia((prev) => {
      const target = prev.find((item) => item.localId === localId);
      if (target?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.localId !== localId);
    });
  };

  const handleClearStagedMedia = () => {
    setStagedMedia((prev) => {
      for (const item of prev) {
        if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
      }
      return [];
    });
  };

  const executeAsyncJob = useCallback(
    (job: AsyncSendJob) => {
      setInFlightCount((c) => c + 1);

      // Start uploading media attachments immediately in parallel without blocking composer or other channels
      const uploadPromise: Promise<ChatAttachment[]> = job.stagedSnapshot.length
        ? Promise.all(
            job.stagedSnapshot.map(async (item) => {
              const att = await apiModel.uploadChatAttachment(job.targetChannelId, item.file);
              seedChatAttachmentPreviewUrl(att.id, item.previewUrl, true);
              return att;
            })
          )
        : Promise.resolve([]);

      void enqueueChannelCommit(job.targetChannelId, async () => {
        const uploaded = await uploadPromise;
        if (job.stagedSnapshot.length > 0) {
          queryClient.setQueryData<Page<ChatMessage>>(
            qk.channelMessages(job.targetChannelId),
            (old) =>
              old
                ? {
                    ...old,
                    items: old.items.map((m) =>
                      m.id === job.clientTempId || m.clientTempId === job.clientTempId
                        ? { ...m, deliveryStatus: "sending" }
                        : m
                    ),
                  }
                : old
          );
        }
        return apiModel.sendMessage(job.targetChannelId, {
          content: job.text,
          replyToId: job.replySnapshot?.id,
          documentId: job.docSnapshot?.id,
          attachmentIds: uploaded.length ? uploaded.map((a) => a.id) : undefined,
          clientTempId: job.clientTempId,
        });
      })
        .then((created) => {
          failedJobsRef.current.delete(job.clientTempId);
          queryClient.setQueryData<Page<ChatMessage>>(
            qk.channelMessages(job.targetChannelId),
            (old) => {
              const base = old ?? getCachedChannelWindow(job.targetChannelId, userId)?.page;
              const reconciled = reconcileIncomingChatMessage(base, created);
              saveCachedChannelWindow(
                job.targetChannelId,
                reconciled.page,
                userId,
                activeChannelRef.current || job.targetChannelId
              );
              return reconciled.page;
            }
          );
        })
        .catch((err) => {
          const errText = describeError(err);
          failedJobsRef.current.set(job.clientTempId, job);
          queryClient.setQueryData<Page<ChatMessage>>(
            qk.channelMessages(job.targetChannelId),
            (old) => {
              if (!old) return old;
              return {
                ...old,
                items: old.items.map((m) =>
                  m.id === job.clientTempId || m.clientTempId === job.clientTempId
                    ? { ...m, optimistic: true, deliveryStatus: "failed", deliveryError: errText }
                    : m
                ),
              };
            }
          );
          if (activeChannelRef.current === job.targetChannelId) {
            onError(errText);
          }
        })
        .finally(() => {
          setInFlightCount((c) => Math.max(0, c - 1));
        });
    },
    [onError, queryClient, userId]
  );

  const handleDispatchSend = (overrideText?: string) => {
    const targetChannelId = activeChannelId;
    if (!targetChannelId) return;
    const rawText = (overrideText ?? content).trim();
    if (!rawText && !attachedDoc && !stagedMedia.length) return;

    const job: AsyncSendJob = {
      targetChannelId,
      text: rawText,
      replySnapshot: replyTo,
      docSnapshot: attachedDoc,
      stagedSnapshot: stagedMedia,
      clientTempId: `temp-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };

    // Clear composer synchronously in 0ms so user can keep typing/sending or switch channels immediately
    if (overrideText === undefined) setContent("");
    setReplyTo(null);
    setAttachedDoc(null);
    setStagedMedia([]);

    const optimisticMsg: ChatMessage = {
      id: job.clientTempId,
      clientTempId: job.clientTempId,
      optimistic: true,
      deliveryStatus: job.stagedSnapshot.length > 0 ? "uploading" : "sending",
      channelId: job.targetChannelId,
      senderId: userId,
      senderFullName: userFullName || "Bạn",
      senderType: "USER",
      content: job.text,
      replyToId: job.replySnapshot?.id,
      replyToSenderName: job.replySnapshot?.senderFullName,
      replyToPreview:
        job.replySnapshot?.content?.slice(0, 90) || (job.replySnapshot ? "[Đính kèm]" : undefined),
      documentId: job.docSnapshot?.id,
      documentName: job.docSnapshot?.name,
      documentContentType: job.docSnapshot?.contentType,
      documentSizeBytes: job.docSnapshot?.sizeBytes,
      attachments: job.stagedSnapshot.map((s, idx) => ({
        id: s.localId,
        channelId: job.targetChannelId,
        fileName: s.file.name,
        contentType: s.file.type || "application/octet-stream",
        mediaKind: s.mediaKind,
        sizeBytes: s.file.size,
        checksumSha256: "",
        sortOrder: idx,
        localPreviewUrl: s.previewUrl,
      })),
      createdAt: job.createdAt,
    };

    queryClient.setQueryData<Page<ChatMessage>>(qk.channelMessages(job.targetChannelId), (old) => {
      const base = old ?? getCachedChannelWindow(job.targetChannelId, userId)?.page;
      return base
        ? { ...base, items: [optimisticMsg, ...base.items], total: base.total + 1 }
        : { items: [optimisticMsg], total: 1, offset: 0, limit: 50 };
    });

    executeAsyncJob(job);
  };

  const handleRetryMessage = useCallback(
    (clientTempId: string) => {
      const job = failedJobsRef.current.get(clientTempId);
      if (!job) return;
      onError("");
      queryClient.setQueryData<Page<ChatMessage>>(
        qk.channelMessages(job.targetChannelId),
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((m) =>
                  m.id === clientTempId || m.clientTempId === clientTempId
                    ? {
                        ...m,
                        optimistic: true,
                        deliveryStatus: job.stagedSnapshot.length > 0 ? "uploading" : "sending",
                        deliveryError: undefined,
                      }
                    : m
                ),
              }
            : old
      );
      executeAsyncJob(job);
    },
    [executeAsyncJob, onError, queryClient]
  );

  const handleDismissFailedMessage = useCallback(
    (channelId: string, clientTempId: string) => {
      const job = failedJobsRef.current.get(clientTempId);
      failedJobsRef.current.delete(clientTempId);
      if (job) {
        for (const s of job.stagedSnapshot) {
          if (s.previewUrl.startsWith("blob:")) URL.revokeObjectURL(s.previewUrl);
        }
      }
      queryClient.setQueryData<Page<ChatMessage>>(qk.channelMessages(channelId), (old) =>
        old
          ? {
              ...old,
              items: old.items.filter((m) => m.id !== clientTempId && m.clientTempId !== clientTempId),
              total: Math.max(0, old.total - 1),
            }
          : old
      );
    },
    [queryClient]
  );

  const resetComposerAttachments = () => {
    setReplyTo(null);
    setAttachedDoc(null);
  };

  return {
    content,
    setContent,
    replyTo,
    setReplyTo,
    attachedDoc,
    setAttachedDoc,
    stagedMedia,
    handleAddFiles,
    handleRemoveStagedMedia,
    handleClearStagedMedia,
    sendPending: inFlightCount > 0,
    handleDispatchSend,
    handleRetryMessage,
    handleDismissFailedMessage,
    resetComposerAttachments,
  };
}
