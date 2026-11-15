import { ReactNode } from "react";

export { describeError } from "@/lib/errors";

export function ListPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-full w-full min-w-0 max-w-full flex-1 flex-col bg-background text-foreground">
      <h1 className="sr-only">{title}</h1>
      {children}
    </div>
  );
}
