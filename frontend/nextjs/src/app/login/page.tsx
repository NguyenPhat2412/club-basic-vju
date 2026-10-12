"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { apiModel } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await apiModel.login(email, password);
      queryClient.clear();
      router.push("/home");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-svh place-items-center bg-[radial-gradient(circle_at_top_left,rgba(204,51,102,0.08),transparent_28%),linear-gradient(180deg,#fff,#fffafc)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top_left,rgba(217,75,124,0.10),transparent_28%),linear-gradient(180deg,#101114,#17181d)]">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/20">VJU</span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">ClubHub</p>
            <p className="text-sm font-semibold text-muted-foreground">Trường Đại học Việt Nhật</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-[2rem] border border-border bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#121418]">
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Đăng nhập</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">Chào mừng trở lại</h1>
            <p className="mt-1 text-sm text-muted-foreground">Vào dashboard, xem CLB, tài liệu và thông báo của bạn.</p>
          </div>

          <div className="grid gap-4">
            <FormField label="Email"><Input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sinhvien@vju.ac.vn" /></FormField>
            <FormField label="Mật khẩu"><Input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></FormField>

            {error && <p role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}

            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Quyền truy cập do quản trị viên cấp</span>
              <button type="button" onClick={() => router.push("/register")} className="font-semibold text-primary hover:underline">Đăng ký</button>
            </div>

            <Button type="submit" disabled={loading} className="mt-1 h-11 font-bold"><LogIn size={16} /> {loading ? "Đang đăng nhập…" : "Đăng nhập"}</Button>
          </div>
        </form>
      </div>
    </main>
  );
}
