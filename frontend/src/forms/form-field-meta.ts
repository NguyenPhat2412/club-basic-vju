export type FormFieldIndicator = "required" | "optional" | "none";

export function sanitizeFormLabel(label: string): string {
  return label
    .replace(/\(\s*([^()]+?)\s*[-–—]\s*(?:tuỳ chọn|tùy chọn)\s*\)\s*$/i, "($1)")
    .replace(/\s*(?:[-–—]\s*(?:tuỳ chọn|tùy chọn)|\(\s*(?:tuỳ chọn|tùy chọn)\s*\))\s*$/i, "")
    .trim();
}

export function resolveFormFieldIndicator(opts: {
  required?: boolean;
  optional?: boolean;
  hideIndicator?: boolean;
  isReadOnlyChild?: boolean;
}): FormFieldIndicator {
  if (opts.hideIndicator) return "none";
  if (opts.required) return "required";
  if (opts.optional) return "optional";
  if (opts.isReadOnlyChild) return "none";
  return "optional";
}
