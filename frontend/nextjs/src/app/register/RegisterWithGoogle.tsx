"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { GoogleSignInButton, useGoogleSignIn } from "@/components/shared/GoogleSignInButton";

export function RegisterWithGoogle() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const google = useGoogleSignIn();
  const notRegistered = useSearchParams().has("chua-dang-ky");
  const domain = google.data?.allowedDomains[0] ?? "st.vju.ac.vn";

  if (google.isPending) return <div className="mt-6 h-[88px] animate-pulse bg-[#f3efe9]" />;
  if (!google.data?.enabled) {
    return (
      <p className="mt-6 border border-[#e7d8b8] bg-[#fbf6ec] p-4 text-[12px] leading-6 text-[#716b64]">
        Đăng ký bằng email trường hiện chưa mở. Vui lòng liên hệ quản trị viên để được cấp tài khoản.
      </p>
    );
  }
  return (
    <div className="mt-6 grid gap-3 border border-[#e8e4df] bg-[#faf9f6] p-5">
      {notRegistered && (
        <p role="status" className="border border-[#e7d8b8] bg-[#fbf6ec] px-3.5 py-2.5 text-[12px] leading-5 text-[#6b4f22]">
          Email trường của bạn <b>chưa có tài khoản</b>. Bấm <b>Đăng ký bằng Google</b> bên dưới và chọn lại đúng tài khoản đó để tạo tài khoản và vào hệ thống.
        </p>
      )}
      <p className="text-[12px] font-semibold text-[#3f3b37]">Đăng ký bằng email trường @{domain}</p>
      <GoogleSignInButton mode="signup" width={340} onSignedIn={() => { queryClient.clear(); router.push("/dashboard"); }} />
      <p className="text-[11px] leading-5 text-[#77716a]">
        Chọn đúng tài khoản Google của trường. Tài khoản ClubHub được tạo ngay; lần sau bấm <b>Đăng nhập bằng Google</b> ở{" "}
        <Link href="/login" className="font-semibold text-[#8e1f32] hover:underline">trang đăng nhập</Link>.
      </p>
    </div>
  );
}
