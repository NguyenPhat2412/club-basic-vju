"use client";

import { ChangeEvent, Children, InputHTMLAttributes, isValidElement, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, useState } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { resolveFormFieldIndicator, sanitizeFormLabel } from "@/forms/form-field-meta";
import { cn } from "@/lib/utils";

const field = "w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-2xs outline-none transition-[box-shadow,border-color,background-color] hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 placeholder:text-muted-foreground";

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

function collectOptions(node: ReactNode, out: { value: string; label: string }[] = []) {
  Children.forEach(node, (child) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode }>(child)) return;
    if (child.type === "option") {
      const label = nodeText(child.props.children).trim();
      out.push({ value: child.props.value !== undefined ? String(child.props.value) : label, label });
    } else if (child.props.children) {
      collectOptions(child.props.children, out);
    }
  });
  return out;
}

const DEFAULT_MAX_LENGTH_BY_TYPE: Record<string, number> = {
  text: 500,
  search: 200,
  email: 320,
  tel: 32,
  url: 1000,
  password: 128,
};

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, maxLength, type, ...props }, ref) {
  const effectiveMaxLength = maxLength ?? DEFAULT_MAX_LENGTH_BY_TYPE[type ?? "text"];
  return <input ref={ref} type={type} maxLength={effectiveMaxLength} className={cn(field, "h-9", className)} {...props} />;
});

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(function PasswordInput({ className, maxLength = 128, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <Input ref={ref} type={visible ? "text" : "password"} maxLength={maxLength} className={cn(className, "pr-10")} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </span>
  );
});

export function Select({ className, children, value, defaultValue, onChange, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const [uncontrolledValue, setUncontrolledValue] = useState(() => (defaultValue !== undefined ? String(defaultValue) : undefined));
  if (props.multiple) {
    return <select className={cn(field, className)} value={value} defaultValue={defaultValue} onChange={onChange} {...props}>{children}</select>;
  }
  const options = collectOptions(children);
  const currentValue = value !== undefined ? String(value) : uncontrolledValue;
  const matched = currentValue !== undefined ? options.find((o) => o.value === currentValue) : undefined;
  const selectedLabel = (matched ?? options[0])?.label ?? "";

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (value === undefined) setUncontrolledValue(e.target.value);
    onChange?.(e);
  };

  return (
    <span
      className={cn(
        "group relative inline-flex h-9 w-full min-w-0 items-center justify-between gap-1.5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-medium text-slate-800 shadow-2xs transition-[box-shadow,border-color,background-color] hover:border-slate-300 hover:bg-white focus-within:border-primary focus-within:bg-white focus-within:ring-1 focus-within:ring-primary has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50",
        className
      )}
    >
      <span aria-hidden="true" className="min-w-0 flex-1 truncate text-left leading-normal">
        {selectedLabel}
      </span>
      <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600" />
      <select
        {...props}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        title={props.title ?? selectedLabel}
        className="absolute inset-0 z-10 size-full cursor-pointer appearance-none opacity-0"
      >
        {children}
      </select>
    </span>
  );
}

export function Textarea({ className, maxLength = 4000, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea maxLength={maxLength} className={cn(field, "min-h-28 py-2.5", className)} {...props} />;
}

export function RequiredMark({ className }: { className?: string }) {
  return (
    <span className={cn("ml-1 font-bold text-destructive", className)} aria-hidden="true">
      *
    </span>
  );
}

export function OptionalMark({ className }: { className?: string }) {
  return (
    <span className={cn("ml-1 text-[11px] font-normal normal-case tracking-normal text-muted-foreground", className)}>
      (Tuỳ chọn)
    </span>
  );
}

export function FormField({
  label,
  required,
  optional,
  hideIndicator,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hideIndicator?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const cleanLabel = sanitizeFormLabel(label);
  const singleChild = Children.count(children) === 1 ? Children.only(children) : null;
  const isReadOnlyChild =
    isValidElement<{ disabled?: boolean; readOnly?: boolean }>(singleChild) &&
    Boolean(singleChild.props.disabled || singleChild.props.readOnly);
  const indicator = resolveFormFieldIndicator({ required, optional, hideIndicator, isReadOnlyChild });

  return (
    <label className="grid gap-1.5 text-xs font-semibold text-foreground">
      <span className="inline-flex flex-wrap items-baseline gap-x-1">
        <span>{cleanLabel}</span>
        {indicator === "required" && (
          <span className="font-bold text-destructive" aria-hidden="true">
            *
          </span>
        )}
        {indicator === "optional" && (
          <span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground">(Tuỳ chọn)</span>
        )}
      </span>
      {children}
      {error ? (
        <span role="alert" className="font-normal text-destructive">{error}</span>
      ) : (
        hint && <span className="font-normal text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}
