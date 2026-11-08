import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-primary text-primary-foreground hover:bg-[#711829] shadow-sm shadow-primary/15",
  destructive: "bg-destructive text-white hover:bg-destructive/90 shadow-sm shadow-destructive/15",
  outline: "border border-border bg-background hover:bg-muted text-foreground shadow-sm",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-muted text-foreground",
} as const;
const sizes = { default: "h-10 px-4", sm: "h-8 px-3 text-xs", icon: "size-10", "icon-sm": "size-8" } as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; size?: keyof typeof sizes };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant = "default", size = "default", ...props }, ref) {
  return <button ref={ref} className={cn("inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0", variants[variant], sizes[size], className)} {...props} />;
});
