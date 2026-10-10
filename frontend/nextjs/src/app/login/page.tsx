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
      router.push("/clubs");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-svh place-items-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">VJU</span>
          <div><p className="text-lg font-black tracking-tight">ClubHub</p><p className="text-xs text-muted-foreground">Trường Đại học Việt Nhật</p></div>
        </div>
        <form onSubmit={submit} className="panel-modal grid gap-4 border-t-4 border-t-destructive p-7">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Đăng nhập</h1>
            <p className="mt-1 text-xs text-muted-foreground">Quản lý câu lạc bộ, hồ sơ thành viên và tài liệu.</p>
          </div>
          <FormField label="Email"><Input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sinhvien@vju.ac.vn" /></FormField>
          <FormField label="Mật khẩu"><Input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></FormField>
          {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-1 font-bold"><LogIn size={16} /> {loading ? "Đang đăng nhập…" : "Đăng nhập"}</Button>
          <p className="text-center text-xs text-muted-foreground">Tài khoản do quản trị viên cấp. Quên mật khẩu? Liên hệ quản trị viên CLB để được đặt lại.</p>
        </form>
      </div>
    </main>
  );
}
