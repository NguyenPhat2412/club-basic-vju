import { useMemo } from "react";
import { useI18n } from "@/providers/I18nContext";

export function useHomeEventDateFormat() {
  const { localeMeta } = useI18n();

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(localeMeta.intlLocale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [localeMeta.intlLocale]
  );

  const shortDayMonthFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(localeMeta.intlLocale, {
        day: "2-digit",
        month: "2-digit",
      }),
    [localeMeta.intlLocale]
  );

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(localeMeta.intlLocale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [localeMeta.intlLocale]
  );

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
  };

  const formatDayMonth = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : shortDayMonthFmt.format(d);
  };

  const formatTimeRange = (startIso?: string, endIso?: string) => {
    if (!startIso) return "";
    const start = new Date(startIso);
    if (Number.isNaN(start.getTime())) return "";
    const startStr = timeFmt.format(start);
    if (!endIso) return startStr;
    const end = new Date(endIso);
    if (Number.isNaN(end.getTime())) return startStr;
    return `${startStr} – ${timeFmt.format(end)}`;
  };

  return { formatDate, formatDayMonth, formatTimeRange };
}
