import { ClubPortfolioView } from "@/components/club/ClubPortfolioView";

export default async function ClubPortfolioPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  return <ClubPortfolioView clubId={clubId} />;
}
