"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, ShieldOff } from "lucide-react";
import { apiModel } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";

export function SystemBlockedIpsCard({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [ipInput, setIpInput] = useState("");
  const [reason, setReason] = useState("");
  const [durationHours, setDurationHours] = useState("24");

  const blocked = useQuery({
    queryKey: qk.blockedIps(),
    queryFn: apiModel.blockedIps,
  });

  const blockMut = useMutation({
    mutationFn: () =>
      apiModel.blockIp({
        ipAddress: ipInput.trim(),
        reason: reason.trim() || null,
        durationHours: Number(durationHours) || 0,
      }),
    onSuccess: (created) => {
      toast.success(`Đã chặn địa chỉ IP ${created.ipAddress}.`);
      setIpInput("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: qk.blockedIps() });
      queryClient.invalidateQueries({ queryKey: qk.systemSecurityOverview() });
    },
    onError: (err) => toast.error(describeError(err)),
  });

  const unblockMut = useMutation({
    mutationFn: (id: string) => apiModel.unblockIp(id),
    onSuccess: () => {
      toast.success("Đã gỡ chặn địa chỉ IP.");
      queryClient.invalidateQueries({ queryKey: qk.blockedIps() });
      queryClient.invalidateQueries({ queryKey: qk.systemSecurityOverview() });
    },
    onError: (err) => toast.error(describeError(err)),
  });

  const items = blocked.data ?? [];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2">
        <div className="flex items-center gap-2">
          <Ban size={13} className="text-primary" />
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Danh sách IP bị chặn
          </h4>
          <Badge tone={items.length > 0 ? "danger" : "neutral"}>
            <span data-no-i18n="true">{items.length}</span> IP
          </Badge>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Input
              maxLength={64}
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="Địa chỉ IP (VD: 203.0.113.45)"
              className="h-8 w-44 bg-white font-mono text-xs"
            />
            <Input
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Lý do"
              className="h-8 w-40 bg-white text-xs"
            />
            <Select
              aria-label="Thời hạn chặn IP"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              className="h-8 w-28 bg-white text-xs"
            >
              <option value="1">1 giờ</option>
              <option value="24">24 giờ</option>
              <option value="168">7 ngày</option>
              <option value="0">Vĩnh viễn</option>
            </Select>
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={!ipInput.trim() || blockMut.isPending}
              onClick={() => blockMut.mutate()}
            >
              <Ban size={12} />
              Chặn IP
            </Button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-4 text-center text-xs text-slate-500">
          Chưa có địa chỉ IP nào đang bị chặn.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-[10.5px] uppercase text-slate-500">
              <tr>
                <th className="px-3.5 py-2 font-semibold">Địa chỉ IP</th>
                <th className="px-3.5 py-2 font-semibold">Lý do</th>
                <th className="px-3.5 py-2 font-semibold">Hết hạn</th>
                <th className="px-3.5 py-2 font-semibold">Người chặn</th>
                <th className="px-3.5 py-2 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="px-3.5 py-2">
                    <code
                      data-no-i18n="true"
                      className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-rose-700"
                    >
                      {item.ipAddress}
                    </code>
                  </td>
                  <td className="px-3.5 py-2 text-slate-700" data-no-i18n="true">
                    {item.reason || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-2 font-mono text-[11px] text-slate-600">
                    {item.expiresAt ? (
                      <span data-no-i18n="true">{formatDateTime(item.expiresAt)}</span>
                    ) : (
                      <Badge tone="danger">Vĩnh viễn</Badge>
                    )}
                  </td>
                  <td className="px-3.5 py-2 text-slate-600" data-no-i18n="true">
                    {item.blockedByName || "—"}
                  </td>
                  <td className="px-3.5 py-2 text-right">
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        disabled={unblockMut.isPending}
                        onClick={() => unblockMut.mutate(item.id)}
                      >
                        <ShieldOff size={12} />
                        Gỡ chặn
                      </Button>
                    ) : (
                      <Badge tone="neutral">Chỉ xem</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
