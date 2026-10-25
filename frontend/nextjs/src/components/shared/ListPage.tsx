import { errorMessage } from "@/lib/errors";
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
  return errorMessage(error);
}
