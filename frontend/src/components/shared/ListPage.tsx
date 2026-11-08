import { errorMessage } from "@/lib/errors";
import { ReactNode } from "react";

export function ListPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-full w-full flex-1 flex-col bg-background text-foreground">
      <h1 className="sr-only">{title}</h1>
      {children}
    </div>
  );
}

export function describeError(error: unknown) {
  return errorMessage(error);
}
