import { ApiError } from "@/lib/api";
import { ReactNode } from "react";

export function ListPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background text-foreground">
      <h1 className="sr-only">{title}</h1>
      {children}
    </div>
  );
}

export function describeError(error: unknown) {
  if (error instanceof ApiError && error.code) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : "Đã có lỗi xảy ra";
}
