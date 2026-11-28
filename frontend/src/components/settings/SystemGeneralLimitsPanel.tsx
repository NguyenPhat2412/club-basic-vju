"use client";

import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SYSTEM_SETTINGS_GROUPS } from "@/forms/settings/settings-form";
import type { SystemSettingsInput } from "@/lib/api";

interface SystemGeneralLimitsPanelProps {
  draft: SystemSettingsInput;
  canEdit: boolean;
  onChange: (next: SystemSettingsInput) => void;
}

export function SystemGeneralLimitsPanel({
  draft,
  canEdit,
  onChange,
}: SystemGeneralLimitsPanelProps) {
  return (
    <div className="min-w-0 columns-1 gap-3 md:columns-2 lg:columns-3">
      {SYSTEM_SETTINGS_GROUPS.map((group) => (
        <section
          key={group.title}
          className="mb-3 min-w-0 break-inside-avoid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
        >
          <h3 className="border-b border-slate-100 bg-slate-50/70 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-primary">
            {group.title}
          </h3>
          <ul className="divide-y divide-slate-100">
            {group.fields.map((f) => (
              <li
                key={f.key}
                title={f.hint}
                className="flex items-center justify-between gap-2.5 px-3.5 py-2.5"
              >
                <label
                  htmlFor={f.key}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-medium text-slate-800"
                >
                  <span className="truncate">{f.label}</span>
                  {f.kind === "number" && canEdit && (
                    <span className="font-bold text-destructive" aria-hidden="true">
                      *
                    </span>
                  )}
                  <Info size={12} className="shrink-0 text-slate-300" aria-hidden="true" />
                </label>

                {f.kind === "toggle" ? (
                  <button
                    id={f.key}
                    type="button"
                    role="switch"
                    aria-checked={draft[f.key]}
                    disabled={!canEdit}
                    onClick={() => onChange({ ...draft, [f.key]: !draft[f.key] })}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                      draft[f.key] ? "bg-primary" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
                        draft[f.key] ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                ) : (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Input
                      id={f.key}
                      type="number"
                      min={f.min}
                      max={f.max}
                      required
                      disabled={!canEdit}
                      className="h-8 w-20 px-2 text-right font-mono text-xs"
                      value={draft[f.key]}
                      onChange={(e) =>
                        onChange({
                          ...draft,
                          [f.key]: Math.max(f.min, Math.min(f.max, Number(e.target.value) || 0)),
                        })
                      }
                    />
                    <span className="w-10 shrink-0 whitespace-nowrap text-[11px] text-slate-500">
                      {f.unit}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
