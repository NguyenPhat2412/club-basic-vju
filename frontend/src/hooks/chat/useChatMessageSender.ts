"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiModel,
  ChatAttachment,
  ChatMessage,
  DocumentItem,
  Page,
  StagedChatMedia,
} from "@/lib/api";
import {
  CHAT_MAX_ATTACHMENTS,
  reconcileIncomingChatMessage,
  saveCachedChannelWindow,
  seedChatAttachmentPreviewUrl,
  validateChatMediaFile,
} from "@/lib/chat-message-cache";
import { describeError } from "@/components/shared/ListPage";

type SendVariables = {
  targetChannelId: string;
  text: string;
  replySnapshot: ChatMessage | null;
  docSnapshot: DocumentItem | null;
  stagedSnapshot: StagedChatMedia[];
  clientTempId: string;
};

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
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [attachedDoc, setAttachedDoc] = useState<DocumentItem | null>(null);
  const [stagedMedia, setStagedMedia] = useState<StagedChatMedia[]>([]);

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

  const sendMessage = useMutation({
    mutationFn: async (vars: SendVariables) => {
      const uploaded: ChatAttachment[] = await Promise.all(
        vars.stagedSnapshot.map(async (item) => {
          const att = await apiModel.uploadChatAttachment(vars.targetChannelId, item.file);
          seedChatAttachmentPreviewUrl(att.id, item.previewUrl, true);
          return att;
        })
      );
      return apiModel.sendMessage(vars.targetChannelId, {
        content: vars.text,
        replyToId: vars.replySnapshot?.id,
        documentId: vars.docSnapshot?.id,
        attachmentIds: uploaded.length ? uploaded.map((a) => a.id) : undefined,
        clientTempId: vars.clientTempId,
      });
    },
    onMutate: (vars) => {
      const optimisticMsg: ChatMessage = {
        id: vars.clientTempId,
        clientTempId: vars.clientTempId,
        optimistic: true,
        channelId: vars.targetChannelId,
        senderId: userId,
        senderFullName: userFullName || "Bạn",
        senderType: "USER",
        content: vars.text,
        replyToId: vars.replySnapshot?.id,
        replyToSenderName: vars.replySnapshot?.senderFullName,
        replyToPreview:
          vars.replySnapshot?.content?.slice(0, 90) || (vars.replySnapshot ? "[Đính kèm]" : undefined),
        documentId: vars.docSnapshot?.id,
        documentName: vars.docSnapshot?.name,
        documentContentType: vars.docSnapshot?.contentType,
        documentSizeBytes: vars.docSnapshot?.sizeBytes,
        attachments: vars.stagedSnapshot.map((s, idx) => ({
          id: s.localId,
          channelId: vars.targetChannelId,
          fileName: s.file.name,
          contentType: s.file.type || "application/octet-stream",
          mediaKind: s.mediaKind,
          sizeBytes: s.file.size,
          checksumSha256: "",
          sortOrder: idx,
          localPreviewUrl: s.previewUrl,
        })),
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<Page<ChatMessage>>(["channel-messages", vars.targetChannelId], (old) =>
        old
          ? { ...old, items: [optimisticMsg, ...old.items], total: old.total + 1 }
          : { items: [optimisticMsg], total: 1, offset: 0, limit: 50 }
      );
    },
    onSuccess: (created, vars) => {
      onError("");
      queryClient.setQueryData<Page<ChatMessage>>(["channel-messages", vars.targetChannelId], (old) => {
        const reconciled = reconcileIncomingChatMessage(old, created);
        saveCachedChannelWindow(vars.targetChannelId, reconciled.page, userId, activeChannelId);
        return reconciled.page;
      });
    },
    onError: (e, vars) => {
      queryClient.setQueryData<Page<ChatMessage>>(["channel-messages", vars.targetChannelId], (old) =>
        old
          ? {
              ...old,
              items: old.items.filter(
                (m) => m.id !== vars.clientTempId && m.clientTempId !== vars.clientTempId
              ),
              total: Math.max(0, old.total - 1),
            }
          : old
      );
      setContent((cur) => cur || vars.text);
      setStagedMedia((cur) => (cur.length ? cur : vars.stagedSnapshot));
      if (!(e instanceof ApiError && e.code === "MESSAGE_NOT_FOUND")) {
        setReplyTo((cur) => cur ?? vars.replySnapshot);
      }
      if (
        !(
          e instanceof ApiError &&
          ["DOCUMENT_DELETED", "DOCUMENT_NOT_FOUND", "DOCUMENT_CLUB_MISMATCH"].includes(e.code ?? "")
        )
      ) {
        setAttachedDoc((cur) => cur ?? vars.docSnapshot);
      }
      onError(describeError(e));
    },
  });

  const handleDispatchSend = (overrideText?: string) => {
    if (!activeChannelId || sendMessage.isPending) return;
    const rawText = (overrideText ?? content).trim();
    if (!rawText && !attachedDoc && !stagedMedia.length) return;
    const vars: SendVariables = {
      targetChannelId: activeChannelId,
      text: rawText,
      replySnapshot: replyTo,
      docSnapshot: attachedDoc,
      stagedSnapshot: stagedMedia,
      clientTempId: `temp-${crypto.randomUUID()}`,
    };
    if (overrideText === undefined) setContent("");
    setReplyTo(null);
    setAttachedDoc(null);
    setStagedMedia([]);
    sendMessage.mutate(vars);
  };

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
    sendPending: sendMessage.isPending,
    handleDispatchSend,
    resetComposerAttachments,
  };
}
