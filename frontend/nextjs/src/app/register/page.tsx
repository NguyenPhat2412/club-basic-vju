"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "../../lib/api";
import styles from "../login/page.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", studentCode: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try { const session = await register(form); localStorage.setItem("vju_access_token", session.accessToken); localStorage.setItem("vju_user", JSON.stringify(session.user)); router.push("/"); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Không thể đăng ký"); }
    finally { setLoading(false); }
  }

  return (
    <main className={styles.page}>
      <section className={styles.visual}><div className={styles.visualMark}>VJ</div><p className={styles.overline}>VJU CLUBS MANAGEMENT</p><h1>Tham gia.<br /><span>Kết nối. Dẫn lối.</span></h1><p className={styles.visualText}>Tạo tài khoản để tham gia các câu lạc bộ và cộng đồng sinh viên VJU.</p><div className={styles.visualLine} /><small>Trường Đại học Việt Nhật · Đại học Quốc gia Hà Nội</small></section>
      <section className={styles.formPanel}><div className={styles.formWrap}><p className={styles.kicker}>TẠO TÀI KHOẢN VJU</p><h2>Đăng ký</h2><p className={styles.subtitle}>Điền thông tin để bắt đầu hành trình cùng cộng đồng.</p>
        <form className={styles.form} onSubmit={submit}>
          <label className={styles.label} htmlFor="fullName">Họ và tên</label><input className={styles.input} id="fullName" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} required />
          <label className={styles.label} htmlFor="registerEmail">Email</label><input className={styles.input} id="registerEmail" type="email" placeholder="you@vju.ac.vn" value={form.email} onChange={(event) => update("email", event.target.value)} required />
          <div className={styles.passwordLabel}><label className={styles.label} htmlFor="registerPassword">Mật khẩu</label></div><input className={styles.input} id="registerPassword" type="password" minLength={8} value={form.password} onChange={(event) => update("password", event.target.value)} required />
          {error && <p className={styles.error} role="alert">{error}</p>}<button className={styles.submitButton} type="submit" disabled={loading}>{loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}<span className={styles.submitArrow}>→</span></button>
        </form><p className={styles.register}>Đã có tài khoản? <a href="/login">Đăng nhập</a></p>
      </div></section>
    </main>
  );
}
