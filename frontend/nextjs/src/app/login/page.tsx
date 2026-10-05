"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../lib/api";
import styles from "./page.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await login(email, password);
      localStorage.setItem("vju_access_token", session.accessToken);
      localStorage.setItem("vju_user", JSON.stringify(session.user));
      router.push("/");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể đăng nhập");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.visual}>
        <div className={styles.visualMark}>VJU</div>
        <p className={styles.overline}>VJU CLUBS MANAGEMENT</p>
        <h1>Một cộng đồng.<br /><span>Nhiều khả năng.</span></h1>
        <p className={styles.visualText}>Nền tảng kết nối và vận hành các câu lạc bộ sinh viên VJU.</p>
        <div className={styles.visualLine} />
        <small>Trường Đại học Việt Nhật · Đại học Quốc gia Hà Nội</small>
      </section>
      <section className={styles.formPanel}>
        <div className={styles.formWrap}>
          <p className={styles.kicker}>CHÀO MỪNG TRỞ LẠI</p>
          <h2>Đăng nhập</h2>
          <p className={styles.subtitle}>Đăng nhập để tiếp tục quản lý cộng đồng của bạn.</p>
          <form className={styles.form} onSubmit={submit}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input className={styles.input} id="email" type="email" autoComplete="email" placeholder="you@vju.ac.vn" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <div className={styles.passwordLabel}><label className={styles.label} htmlFor="password">Mật khẩu</label><a href="#forgot">Quên mật khẩu?</a></div>
            <input className={styles.input} id="password" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu của bạn" value={password} onChange={(event) => setPassword(event.target.value)} required />
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button className={styles.submitButton} type="submit" disabled={loading}>{loading ? "Đang xác thực..." : "Đăng nhập"}<span className={styles.submitArrow}>→</span></button>
          </form>
          <p className={styles.register}>Chưa có tài khoản? <a href="/register">Đăng ký ngay</a></p>
        </div>
      </section>
    </main>
  );
}
