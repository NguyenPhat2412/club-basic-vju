"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  Globe2,
  Mail,
  Save,
  Server,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { qk } from "@/lib/api/query-keys";
import { apiModel, SystemSettings, SystemSettingsInput } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import {
  createSystemSettingsDraft,
  hasSystemSettingsChanged,
  toSystemSettingsPayload,
} from "@/forms/settings/settings-form";
import { SystemGeneralLimitsPanel } from "./SystemGeneralLimitsPanel";
import { SystemSmtpCard } from "./SystemSmtpCard";
import { SystemIntegrationsCard } from "./SystemIntegrationsCard";
import { SystemTelegramCard } from "./SystemTelegramCard";
import { SystemSecurityMonitorPanel } from "./SystemSecurityMonitorPanel";
import { SystemOpsHealthPanel } from "./SystemOpsHealthPanel";

type SettingsTabId = "general" | "smtp" | "integrations" | "telegram" | "security" | "ops";

interface SettingsNavItem {
  id: SettingsTabId;
  label: string;
  icon: ReactNode;
  statusDot?: "active" | "idle";
}

export function SystemSettingsView() {
  const session = useSession();
  const canView = session.can("setting.view");
  const canEdit = session.can("setting.update");
  const canViewAudit = session.can("audit.view");
  const [notice, setNotice] = useState<{ seq: number; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");

  const settings = useQuery({
    queryKey: qk.systemSettings(),
    queryFn: apiModel.systemSettings,
    enabled: session.ready && canView,
  });

  if (session.ready && !canView) {
    return (
      <ListPage title="Cài đặt hệ thống">
        <EmptyState icon={<Settings />} title="Bạn không có quyền xem cài đặt hệ thống" />
      </ListPage>
    );
  }

  return (
    <div className="flex min-h-full w-full min-w-0 max-w-full flex-1 flex-col overflow-x-clip">
      {notice && <Notice key={notice.seq} tone="success">{notice.text}</Notice>}
      <div className="w-full min-w-0 px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
        {settings.isPending ? (
          <LoadingRows rows={4} />
        ) : settings.isError ? (
          <ErrorState message={describeError(settings.error)} onRetry={() => settings.refetch()} />
        ) : (
          <SettingsWorkspace
            key={settings.data.updatedAt ?? "default"}
            current={settings.data}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            canEdit={canEdit}
            canViewAudit={canViewAudit}
            currentUserId={session.user?.id}
            defaultRecipientEmail={session.user?.email ?? ""}
            onSaved={(saved) =>
              setNotice((prev) => ({
                seq: (prev?.seq ?? 0) + 1,
                text: `Đã cập nhật cài đặt hệ thống lúc ${formatDateTime(saved.updatedAt)}.`,
              }))
            }
          />
        )}
      </div>
    </div>
  );
}

function SettingsWorkspace({
  current,
  activeTab,
  onSelectTab,
  canEdit,
  canViewAudit,
  currentUserId,
  defaultRecipientEmail,
  onSaved,
}: {
  current: SystemSettings;
  activeTab: SettingsTabId;
  onSelectTab: (tab: SettingsTabId) => void;
  canEdit: boolean;
  canViewAudit: boolean;
  currentUserId?: string;
  defaultRecipientEmail: string;
  onSaved: (saved: SystemSettings) => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<SystemSettingsInput>(() => createSystemSettingsDraft(current));
  const save = useMutation({
    mutationFn: () => apiModel.updateSystemSettings(toSystemSettingsPayload(draft)),
    onSuccess: (saved) => {
      queryClient.setQueryData(qk.systemSettings(), saved);
      queryClient.invalidateQueries({ queryKey: qk.publicSystemStatus() });
      queryClient.invalidateQueries({ queryKey: qk.systemInfraHealth() });
      setDraft(createSystemSettingsDraft(saved));
      onSaved(saved);
    },
  });
  const changed = hasSystemSettingsChanged(draft, current);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (activeTab !== "security") {
      save.mutate();
    }
  };

  const smtpReady = Boolean((current.smtpHost ?? "").trim());
  const integrationsReady =
    current.facebookOauthConfigured || current.aiConfigured || current.googleSignInConfigured;
  const telegramActive = current.telegramEnabled && current.telegramConfigured;

  const navItems: SettingsNavItem[] = [
    { id: "general", label: "Giới hạn", icon: <SlidersHorizontal size={14} /> },
    { id: "smtp", label: "SMTP", icon: <Mail size={14} />, statusDot: smtpReady ? "active" : "idle" },
    { id: "integrations", label: "Tích hợp", icon: <Globe2 size={14} />, statusDot: integrationsReady ? "active" : "idle" },
    { id: "telegram", label: "Telegram", icon: <BellRing size={14} />, statusDot: telegramActive ? "active" : "idle" },
    { id: "security", label: "Bảo mật", icon: <ShieldCheck size={14} />, statusDot: "active" },
    {
      id: "ops",
      label: "Hạ tầng",
      icon: <Server size={14} />,
      statusDot: current.maintenanceMode || current.announcementEnabled ? "active" : "idle",
    },
  ];

  const isConfigTab = activeTab !== "security";

  return (
    <form onSubmit={submit} className="min-w-0 space-y-3.5 pb-16">
      {/* Compact horizontal top tab bar + inline save control */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-2xs">
        <nav
          role="tablist"
          aria-label="Danh mục cài đặt hệ thống"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
        >
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? "bg-primary text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.statusDot && (
                  <span
                    className={`size-1.5 rounded-full ${
                      active
                        ? "bg-white/90"
                        : item.statusDot === "active"
                          ? "bg-primary"
                          : "bg-slate-300"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {isConfigTab && (
          <div className="flex shrink-0 items-center gap-2.5 pl-1">
            {current.updatedAt && (
              <span className="hidden text-[11px] text-slate-400 2xl:inline">
                <span>Cập nhật</span>{" "}
                <span data-no-i18n="true">{formatDateTime(current.updatedAt)}</span>
              </span>
            )}
            {canEdit ? (
              <Button
                type="submit"
                size="sm"
                className="h-8 shrink-0"
                disabled={!changed || save.isPending}
              >
                <Save size={13} />
                {save.isPending ? "Đang lưu…" : "Lưu cài đặt"}
              </Button>
            ) : (
              <span className="text-xs text-slate-500">Chỉ có quyền xem</span>
            )}
          </div>
        )}
      </div>

      {save.isError && <Notice tone="error">{describeError(save.error)}</Notice>}

      {activeTab === "general" && (
        <SystemGeneralLimitsPanel draft={draft} canEdit={canEdit} onChange={setDraft} />
      )}

      {activeTab === "smtp" && (
        <SystemSmtpCard
          current={current}
          draft={draft}
          canEdit={canEdit}
          hasUnsavedChanges={changed}
          defaultRecipientEmail={defaultRecipientEmail}
          onChange={setDraft}
        />
      )}

      {activeTab === "integrations" && (
        <SystemIntegrationsCard
          current={current}
          draft={draft}
          canEdit={canEdit}
          onChange={setDraft}
        />
      )}

      {activeTab === "telegram" && (
        <SystemTelegramCard
          current={current}
          draft={draft}
          canEdit={canEdit}
          hasUnsavedChanges={changed}
          onChange={setDraft}
        />
      )}

      {activeTab === "security" && (
        <SystemSecurityMonitorPanel
          currentUserId={currentUserId}
          canEdit={canEdit}
          canViewAudit={canViewAudit}
        />
      )}

      {activeTab === "ops" && (
        <SystemOpsHealthPanel draft={draft} canEdit={canEdit} onChange={setDraft} />
      )}
    </form>
  );
}
