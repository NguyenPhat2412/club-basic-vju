"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, UserPlus, Users } from "lucide-react";
import { apiModel } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { describeError } from "@/components/shared/ListPage";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function ClubFollowButton({
  clubId,
  isAuthenticated,
}: {
  clubId: string;
  isAuthenticated: boolean;
}) {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({
    queryKey: qk.publicClubFollowStatus(clubId),
    queryFn: () => apiModel.publicClubFollowStatus(clubId),
    enabled: Boolean(clubId),
    staleTime: 30_000,
  });

  const toggleMut = useMutation({
    mutationFn: () => apiModel.toggleClubFollow(clubId),
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.publicClubFollowStatus(clubId), updated);
      toast.success(
        updated.following
          ? "Đã theo dõi câu lạc bộ."
          : "Đã bỏ theo dõi câu lạc bộ.",
      );
    },
    onError: (err) => toast.error(describeError(err)),
  });

  const following = Boolean(statusQuery.data?.following);
  const followersCount = statusQuery.data?.followersCount ?? 0;

  const handleClick = () => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để theo dõi câu lạc bộ.");
      return;
    }
    toggleMut.mutate();
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={toggleMut.isPending}
        onClick={handleClick}
        aria-pressed={following}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-lg border px-3.5 text-xs font-bold transition-colors disabled:opacity-60",
          following
            ? "border-primary/35 bg-primary/10 text-primary hover:bg-primary/15"
            : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary",
        )}
      >
        {following ? <Check size={14} /> : <UserPlus size={14} />}
        <span>{following ? "Đang theo dõi" : "Theo dõi CLB"}</span>
      </button>
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground tabular-nums">
        <Users size={13} className="text-primary" />
        <span>{followersCount} người theo dõi</span>
      </span>
    </div>
  );
}
