"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiModel } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { useSession } from "@/hooks/useSession";
import { useActiveUnit } from "@/hooks/useActiveUnit";
import { DocumentsViewContent } from "@/components/document/DocumentsViewContent";
import { LoadingRows } from "@/components/shared/States";

export function DocumentsView({ embeddedClubId }: { embeddedClubId?: string } = {}) {
  return (
    <Suspense fallback={<LoadingRows />}>
      <DocumentsViewInner embeddedClubId={embeddedClubId} />
    </Suspense>
  );
}

function DocumentsViewInner({ embeddedClubId }: { embeddedClubId?: string }) {
  const session = useSession();
  const unitCtx = useActiveUnit();
  const searchParams = useSearchParams();
  const isEmbedded = Boolean(embeddedClubId);
  const tier: "club" | "system" = isEmbedded ? "club" : searchParams.get("tier") === "system" ? "system" : "club";

  const clubs = useQuery({
    queryKey: qk.clubs("documents"),
    queryFn: () => apiModel.clubs("", "", 0, 100),
    enabled: session.ready,
  });
  const scope = session.clubsWith(["document.view", "document.upload", "document.update", "document.delete", "document.restore"]);
  const allClubs = clubs.data?.items ?? [];
  const allowed = allClubs.filter((c) => scope.global || scope.ids.has(c.id));
  const effectiveTier = !isEmbedded && tier === "club" && session.ready && !clubs.isPending && !allowed.length ? "system" : tier;
  const isSystemTier = effectiveTier === "system";
  const selectedClubId = unitCtx.activeClubId;
  const club = isEmbedded
    ? allClubs.find((c) => c.id === embeddedClubId)
    : (allowed.find((c) => c.id === selectedClubId) ?? allowed[0]);
  const activeClubId = isEmbedded ? (embeddedClubId ?? "") : (club?.id ?? "");
  const contentKey = isSystemTier ? "system" : activeClubId || "pending";

  return (
    <DocumentsViewContent
      key={contentKey}
      isEmbedded={isEmbedded}
      effectiveTier={effectiveTier}
      isSystemTier={isSystemTier}
      clubsPending={clubs.isPending}
      allClubs={allClubs}
      allowed={allowed}
      club={club}
      activeClubId={activeClubId}
    />
  );
}
