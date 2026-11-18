import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export { describeError } from "@/lib/errors";

export function ListPage({
  title,
  fillViewport = false,
  children,
}: {
  title: string;
  fillViewport?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full flex-1 flex-col text-foreground",
        fillViewport ? "h-full min-h-0 overflow-hidden" : "min-h-full"
      )}
    >
      <h1 className="sr-only">{title}</h1>
      {children}
    </div>
  );
}
