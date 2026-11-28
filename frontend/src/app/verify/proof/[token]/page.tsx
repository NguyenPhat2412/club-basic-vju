import { CertificateProofVerifyView } from "@/components/certificate/CertificateProofVerifyView";

export default async function VerifyCertificateProofPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CertificateProofVerifyView token={decodeURIComponent(token)} />;
}
