"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function Home() { const router = useRouter(); useEffect(() => { router.replace("/clubs"); }, [router]); return <div className="loading">Đang mở ClubHub…</div>; }
