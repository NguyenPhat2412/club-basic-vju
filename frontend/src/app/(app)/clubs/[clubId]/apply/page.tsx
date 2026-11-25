import { ClubApplyView } from "@/components/club/ClubApplyView";

export default async function ClubApplyPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  return <ClubApplyView clubId={clubId} />;
}
