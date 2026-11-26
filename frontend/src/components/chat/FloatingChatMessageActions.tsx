"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Copy, MoreHorizontal, Pencil, Pin, PinOff, Reply, Trash2 } from "lucide-react";
import { ChatReactionTrigger } from "@/components/management/ChatMessageReactions";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat/chat.types";

const MENU_BTN =
  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11.5px] font-medium text-slate-700 hover:bg-slate-100";

export function FloatingChatMessageActions({
  message: m,
  isMine,
  canSend,
  canEdit,
  canDelete,
  myEmojis,
  onReply,
  onToggleReaction,
  onTogglePin,
  onStartEdit,
  onDeleteMessage,
  onActiveChange,
}: {
  message: ChatMessage;
  isMine: boolean;
  canSend: boolean;
  canEdit: boolean;
  canDelete: boolean;
  myEmojis: Set<string>;
  onReply: (msg: ChatMessage) => void;
  onToggleReaction: (msg: ChatMessage, emoji: string) => void;
  onTogglePin: (msg: ChatMessage) => void;
  onStartEdit: () => void;
  onDeleteMessage: (msg: ChatMessage) => Promise<void> | void;
  onActiveChange: (active: boolean) => void;
}) {
  const [activePopup, setActivePopup] = useState<"none" | "menu" | "reaction">("none");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const menuOpen = activePopup === "menu";
  const reactionOpen = activePopup === "reaction";

  const updatePopup = (next: "none" | "menu" | "reaction") => {
    setConfirmDelete(false);
    setActivePopup(next);
    onActiveChange(next !== "none");
  };

  useEffect(() => {
    if (activePopup === "none") return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setConfirmDelete(false);
        setActivePopup("none");
        onActiveChange(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConfirmDelete(false);
        setActivePopup("none");
        onActiveChange(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [activePopup, onActiveChange]);

  useLayoutEffect(() => {
    const popupEl = popupRef.current;
    const anchorEl = wrapRef.current;
    if (activePopup === "none" || !popupEl || !anchorEl) return;

    popupEl.style.marginLeft = "";
    popupEl.style.marginRight = "";
    popupEl.style.top = "";
    popupEl.style.bottom = "";
    popupEl.style.marginTop = "";
    popupEl.style.marginBottom = "";

    const scrollEl = anchorEl.closest('[data-chat-scroll="true"]');
    if (!scrollEl) return;
    const sRect = scrollEl.getBoundingClientRect();
    const pRect = popupEl.getBoundingClientRect();
    const aRect = anchorEl.getBoundingClientRect();

    if (aRect.top - pRect.height - 8 < sRect.top) {
      popupEl.style.bottom = "auto";
      popupEl.style.top = "100%";
      popupEl.style.marginTop = "6px";
      popupEl.style.marginBottom = "0px";
    }

    let dx = 0;
    if (pRect.left < sRect.left + 8) dx = Math.ceil(sRect.left + 8 - pRect.left);
    else if (pRect.right > sRect.right - 8) dx = Math.floor(sRect.right - 8 - pRect.right);

    if (dx !== 0) {
      if (isMine) popupEl.style.marginLeft = `${dx}px`;
      else popupEl.style.marginRight = `${-dx}px`;
    }
  }, [activePopup, isMine]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative flex shrink-0 items-center gap-0.5 transition-opacity",
        activePopup !== "none"
          ? "opacity-100"
          : "opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100",
      )}
    >
      <ChatReactionTrigger
        isMine={isMine}
        myEmojis={myEmojis}
        controlledOpen={reactionOpen}
        onControlledOpenChange={(next) => updatePopup(next ? "reaction" : "none")}
        popupAlign={isMine ? "left" : "right"}
        popupRef={reactionOpen ? popupRef : undefined}
        onToggleReaction={(emoji) => onToggleReaction(m, emoji)}
      />

      {canSend && (
        <button
          type="button"
          title="Trả lời"
          aria-label="Trả lời"
          onClick={() => { updatePopup("none"); onReply(m); }}
          className="grid h-6 w-6 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900"
        >
          <Reply size={12.5} />
        </button>
      )}

      <button
        type="button"
        title="Tuỳ chọn tin nhắn"
        aria-label="Tuỳ chọn tin nhắn"
        aria-expanded={menuOpen}
        onClick={() => updatePopup(menuOpen ? "none" : "menu")}
        className={cn(
          "grid h-6 w-6 place-items-center rounded-full transition-colors",
          menuOpen
            ? "bg-primary/12 text-primary"
            : "text-slate-500 hover:bg-slate-200/70 hover:text-slate-900",
        )}
      >
        <MoreHorizontal size={13} />
      </button>

      {menuOpen && (
        <div
          ref={popupRef}
          role="menu"
          className={cn(
            "tg-pop-in absolute bottom-full z-40 mb-1.5 w-44 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-xl",
            isMine ? "left-0" : "right-0",
          )}
        >
          {m.content?.trim() && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void navigator.clipboard?.writeText(m.content);
                toast.success("Đã sao chép tin nhắn.");
                updatePopup("none");
              }}
              className={MENU_BTN}
            >
              <Copy size={12} /> Sao chép văn bản
            </button>
          )}
          {canSend && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { onTogglePin(m); updatePopup("none"); }}
              className={MENU_BTN}
            >
              {m.pinned ? <PinOff size={12} /> : <Pin size={12} />}
              {m.pinned ? "Bỏ ghim" : "Ghim tin nhắn"}
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { onStartEdit(); updatePopup("none"); }}
              className={MENU_BTN}
            >
              <Pencil size={12} /> Chỉnh sửa tin nhắn
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (!confirmDelete) { setConfirmDelete(true); return; }
                updatePopup("none");
                void onDeleteMessage(m);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11.5px] font-semibold text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={12} />
              {confirmDelete ? "Bấm lần nữa để xoá hẳn" : "Xoá tin nhắn"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
