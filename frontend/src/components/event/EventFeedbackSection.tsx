"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, MessageSquareHeart, Star } from "lucide-react";
import { apiModel } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { useSession } from "@/hooks/useSession";
import { Section } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { LoadingRows } from "@/components/shared/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Textarea } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";

export function EventFeedbackSection({
  eventId,
  eventStatus,
  canSubmit,
  onNotice,
  onError,
}: {
  eventId: string;
  eventStatus: string;
  canSubmit: boolean;
  onNotice?: (msg: string) => void;
  onError?: (msg: string) => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [showList, setShowList] = useState(false);

  const enabled = Boolean(eventId) && eventStatus !== "DRAFT" && eventStatus !== "CANCELLED";

  const feedbacks = useQuery({
    queryKey: qk.eventFeedbacks(eventId),
    queryFn: () => apiModel.listEventFeedbacks(eventId),
    enabled,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      apiModel.submitEventFeedback(eventId, {
        rating,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      setComment("");
      onError?.("");
      onNotice?.("Cảm ơn bạn đã gửi khảo sát đánh giá sự kiện.");
      queryClient.invalidateQueries({ queryKey: qk.eventFeedbacks(eventId) });
    },
    onError: (err) => onError?.(describeError(err)),
  });

  if (!enabled) {
    return null;
  }

  const items = feedbacks.data?.items ?? [];
  const totalCount = feedbacks.data?.totalCount ?? 0;
  const averageRating = feedbacks.data?.averageRating ?? 0;
  const myFeedback = items.find((item) => item.userId === session.user?.id);
  const effectiveCanSubmit = feedbacks.data?.canSubmit ?? canSubmit;

  return (
    <Section title="Khảo sát mức độ hài lòng sau sự kiện" icon={<MessageSquareHeart />}>
      {feedbacks.isPending ? (
        <LoadingRows rows={2} />
      ) : feedbacks.isError ? (
        <p className="text-xs text-muted-foreground">Không tải được dữ liệu khảo sát sự kiện.</p>
      ) : (
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Star size={14} className="fill-primary text-primary" />
              <span className="font-bold text-foreground">
                {totalCount > 0 ? `${averageRating.toFixed(1)} / 5.0` : "Chưa có điểm"}
              </span>
              <Badge tone="neutral">{totalCount} lượt đánh giá</Badge>
            </div>
            {items.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                onClick={() => setShowList((prev) => !prev)}
              >
                {showList ? (
                  <>Thu gọn <ChevronUp size={13} /></>
                ) : (
                  <>Xem nhận xét ({items.length}) <ChevronDown size={13} /></>
                )}
              </Button>
            )}
          </div>

          {effectiveCanSubmit && !myFeedback && (
            <div className="space-y-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="font-semibold text-foreground">Đánh giá trải nghiệm của bạn</p>
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn số sao đánh giá">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= rating;
                  return (
                    <button
                      key={star}
                      type="button"
                      aria-label={`${star} sao`}
                      aria-pressed={rating === star}
                      onClick={() => setRating(star)}
                      className="rounded-md border border-border bg-card p-1.5 transition-colors hover:border-primary/40"
                    >
                      <Star
                        size={16}
                        className={active ? "fill-primary text-primary" : "text-muted-foreground"}
                      />
                    </button>
                  );
                })}
                <span className="ml-1 font-medium text-muted-foreground">{rating} / 5 sao</span>
              </div>
              <FormField label="Nhận xét góp ý" optional>
                <Textarea
                  value={comment}
                  maxLength={1000}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ cảm nhận về nội dung, công tác tổ chức, điều phối…"
                  className="min-h-20 text-xs"
                />
              </FormField>
              <Button
                type="button"
                size="sm"
                disabled={submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                {submitMutation.isPending ? "Đang gửi…" : "Gửi đánh giá sự kiện"}
              </Button>
            </div>
          )}

          {myFeedback && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <p className="font-semibold text-foreground">
                Bạn đã đánh giá sự kiện này ({myFeedback.rating}/5 sao)
              </p>
              {myFeedback.comment && (
                <p className="mt-1 whitespace-pre-line text-muted-foreground">{myFeedback.comment}</p>
              )}
            </div>
          )}

          {items.length > 0 && showList && (
            <ul className="max-h-56 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border">
              {items.map((item) => (
                <li key={item.id} className="space-y-1 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      {item.userFullName || "Thành viên VJU"}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-semibold text-primary">
                        <Star size={12} className="fill-primary text-primary" /> {item.rating}/5
                      </span>
                      <span>{formatDateTime(item.createdAt)}</span>
                    </div>
                  </div>
                  {item.comment && (
                    <p className="whitespace-pre-line text-muted-foreground">{item.comment}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Section>
  );
}
