import type { Metadata } from "next";
import { CertificateVerifyView } from "@/components/certificate/CertificateVerifyView";

export const metadata: Metadata = {
  title: "Xác thực Chứng nhận Điện tử — VJU ClubHub",
  description:
    "Tra cứu và xác thực tính hợp lệ của chứng nhận điện tử sự kiện, cộng tác viên và ban tổ chức trên hệ thống VJU ClubHub.",
};

function decodeCertificateCode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default async function PublicCertificateVerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <CertificateVerifyView code={decodeCertificateCode(code)} />;
}
