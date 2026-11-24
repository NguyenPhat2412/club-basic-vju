"use client";

import { Bot, Facebook, Globe2, ShieldCheck, Trash2 } from "lucide-react";
import { SystemSettings, SystemSettingsInput } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, PasswordInput, Select } from "@/components/ui/input";

interface SystemIntegrationsCardProps {
  current: SystemSettings;
  draft: SystemSettingsInput;
  canEdit: boolean;
  onChange: (next: SystemSettingsInput) => void;
}

function secretHint(
  clearing: boolean | undefined,
  pendingValue: string | undefined,
  storedInDb: boolean,
  effectiveReady: boolean,
) {
  if (clearing) return "Sẽ xoá bản ghi đè khi lưu (quay về dùng .env)";
  if ((pendingValue ?? "").trim()) return "Sẽ mã hoá AES-256-GCM và lưu khoá mới";
  if (storedInDb) return "Đã lưu mã hoá trong Cài đặt hệ thống";
  if (effectiveReady) return "Đang sử dụng giá trị từ biến môi trường (.env)";
  return "Chưa thiết lập khoá bí mật";
}

export function SystemIntegrationsCard({
  current,
  draft,
  canEdit,
  onChange,
}: SystemIntegrationsCardProps) {
  const fbSecretHint = secretHint(
    draft.clearFacebookAppSecret,
    draft.facebookAppSecret,
    current.facebookAppSecretConfigured,
    current.facebookOauthConfigured,
  );
  const aiKeyHint = secretHint(
    draft.clearAiApiKey,
    draft.aiApiKey,
    current.aiApiKeyConfigured,
    current.aiConfigured,
  );

  const googleModeValue =
    draft.googleCreateAccounts === null || draft.googleCreateAccounts === undefined
      ? "env"
      : draft.googleCreateAccounts
        ? "true"
        : "false";

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <Globe2 size={14} className="text-primary" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Tích hợp bên ngoài & Biến môi trường (.env)
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck size={13} className="text-primary" />
          Để trống bất kỳ trường nào để dùng giá trị mặc định trong tệp .env
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {/* 1. Facebook Fanpage OAuth */}
        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Facebook size={15} className="text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Facebook OAuth & Graph API
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...draft,
                      facebookGraphVersion: draft.facebookGraphVersion || "v22.0",
                      facebookOauthRedirectUri: "http://localhost:8080/api/v1/integrations/facebook/oauth/callback",
                      frontendBaseUrl: "http://localhost:3000",
                    })
                  }
                  className="rounded-full border border-primary/25 bg-white px-2.5 py-0.5 text-[10.5px] font-bold text-primary transition-colors hover:bg-primary/5"
                >
                  Điền mẫu Localhost
                </button>
              )}
              <Badge tone={current.facebookOauthConfigured ? "success" : "neutral"}>
                {current.facebookOauthConfigured ? "OAuth sẵn sàng" : "Chưa cấu hình OAuth"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Facebook App ID" hint="FACEBOOK_APP_ID từ Meta for Developers">
              <Input
                maxLength={64}
                disabled={!canEdit}
                value={draft.facebookAppId ?? ""}
                onChange={(e) => onChange({ ...draft, facebookAppId: e.target.value })}
                placeholder="Dùng từ .env nếu để trống"
                className="h-9 font-mono text-xs"
              />
            </FormField>

            <FormField label="Facebook App Secret" hint={fbSecretHint}>
              <div className="flex items-center gap-1.5">
                <PasswordInput
                  maxLength={256}
                  autoComplete="new-password"
                  disabled={!canEdit}
                  value={draft.facebookAppSecret ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      facebookAppSecret: e.target.value,
                      clearFacebookAppSecret: false,
                    })
                  }
                  placeholder={
                    current.facebookAppSecretConfigured
                      ? "•••••••• (đã lưu trong hệ thống)"
                      : "FACEBOOK_APP_SECRET"
                  }
                  className="h-9 font-mono text-xs"
                />
                {canEdit && current.facebookAppSecretConfigured && !draft.clearFacebookAppSecret && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onChange({ ...draft, facebookAppSecret: "", clearFacebookAppSecret: true })
                    }
                    title="Xoá Facebook App Secret đã lưu"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </FormField>

            <FormField label="Phiên bản Graph API" hint="FACEBOOK_GRAPH_VERSION (mặc định v22.0)">
              <Input
                maxLength={32}
                disabled={!canEdit}
                value={draft.facebookGraphVersion ?? ""}
                onChange={(e) => onChange({ ...draft, facebookGraphVersion: e.target.value })}
                placeholder="v22.0"
                className="h-9 font-mono text-xs"
              />
            </FormField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Valid OAuth Redirect URI"
              hint="FACEBOOK_OAUTH_REDIRECT_URI phải khớp chính xác với Meta App"
            >
              <Input
                maxLength={500}
                disabled={!canEdit}
                value={draft.facebookOauthRedirectUri ?? ""}
                onChange={(e) => onChange({ ...draft, facebookOauthRedirectUri: e.target.value })}
                placeholder="http://localhost:8080/api/v1/integrations/facebook/oauth/callback"
                className="h-9 font-mono text-xs"
              />
            </FormField>

            <FormField
              label="Frontend Base URL"
              hint="FRONTEND_BASE_URL dùng để chuyển hướng lại sau khi đăng nhập Facebook"
            >
              <Input
                maxLength={500}
                disabled={!canEdit}
                value={draft.frontendBaseUrl ?? ""}
                onChange={(e) => onChange({ ...draft, frontendBaseUrl: e.target.value })}
                placeholder="http://localhost:3000"
                className="h-9 font-mono text-xs"
              />
            </FormField>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900">Tự động đồng bộ Fanpage Facebook định kỳ</p>
              <p className="text-[11px] text-slate-500">
                Tiến trình nền tự làm mới bài viết, chỉ số tương tác và đường dẫn ảnh theo chu kỳ (tự cảnh báo nếu Token hết hạn).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={15}
                  max={1440}
                  disabled={!canEdit || !draft.facebookAutoSyncEnabled}
                  value={draft.facebookAutoSyncIntervalMinutes}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      facebookAutoSyncIntervalMinutes: Math.max(15, Math.min(1440, Number(e.target.value) || 60)),
                    })
                  }
                  className="h-8 w-20 bg-white text-right text-xs"
                  aria-label="Chu kỳ đồng bộ tự động (phút)"
                />
                <span className="text-[11px] text-slate-500">phút</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Bật tự động đồng bộ Facebook"
                aria-checked={draft.facebookAutoSyncEnabled}
                disabled={!canEdit}
                onClick={() => onChange({ ...draft, facebookAutoSyncEnabled: !draft.facebookAutoSyncEnabled })}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${draft.facebookAutoSyncEnabled ? "bg-primary" : "bg-slate-300"}`}
              >
                <span
                  className={`absolute left-0 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${draft.facebookAutoSyncEnabled ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 2. AI Gateway (9router) */}
        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot size={15} className="text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Cổng AI (Tóm tắt thảo luận & Dịch tự động)
              </h4>
            </div>
            <Badge tone={current.aiConfigured ? "success" : "neutral"}>
              {current.aiConfigured ? "AI đang kết nối" : "Đang dùng chế độ ngoại tuyến"}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="AI Base URL" hint="AI_BASE_URL (tương thích OpenAI / 9router)">
              <Input
                maxLength={500}
                disabled={!canEdit}
                value={draft.aiBaseUrl ?? ""}
                onChange={(e) => onChange({ ...draft, aiBaseUrl: e.target.value })}
                placeholder="https://router.anhchau.all1.vn/v1"
                className="h-9 font-mono text-xs"
              />
            </FormField>

            <FormField label="AI API Key" hint={aiKeyHint}>
              <div className="flex items-center gap-1.5">
                <PasswordInput
                  maxLength={256}
                  autoComplete="new-password"
                  disabled={!canEdit}
                  value={draft.aiApiKey ?? ""}
                  onChange={(e) =>
                    onChange({ ...draft, aiApiKey: e.target.value, clearAiApiKey: false })
                  }
                  placeholder={
                    current.aiApiKeyConfigured ? "•••••••• (đã lưu trong hệ thống)" : "AI_API_KEY"
                  }
                  className="h-9 font-mono text-xs"
                />
                {canEdit && current.aiApiKeyConfigured && !draft.clearAiApiKey && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onChange({ ...draft, aiApiKey: "", clearAiApiKey: true })}
                    title="Xoá AI API Key đã lưu"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </FormField>

            <FormField label="AI Model" hint="AI_MODEL (VD: apmarket, gpt-4o-mini)">
              <Input
                maxLength={120}
                disabled={!canEdit}
                value={draft.aiModel ?? ""}
                onChange={(e) => onChange({ ...draft, aiModel: e.target.value })}
                placeholder="apmarket"
                className="h-9 font-mono text-xs"
              />
            </FormField>
          </div>
        </div>

        {/* 3. Google Sign-In */}
        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Globe2 size={15} className="text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Đăng nhập Google (Tài khoản sinh viên VJU)
              </h4>
            </div>
            <Badge tone={current.googleSignInConfigured ? "success" : "neutral"}>
              {current.googleSignInConfigured ? "Google SSO đang bật" : "Google SSO đang tắt"}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Google Client ID" hint="GOOGLE_CLIENT_ID từ Google Cloud Console">
              <Input
                maxLength={255}
                disabled={!canEdit}
                value={draft.googleClientId ?? ""}
                onChange={(e) => onChange({ ...draft, googleClientId: e.target.value })}
                placeholder="xxxx.apps.googleusercontent.com"
                className="h-9 font-mono text-xs"
              />
            </FormField>

            <FormField
              label="Tên miền email được phép"
              hint="GOOGLE_ALLOWED_DOMAINS (phân tách bằng dấu phẩy)"
            >
              <Input
                maxLength={500}
                disabled={!canEdit}
                value={draft.googleAllowedDomains ?? ""}
                onChange={(e) => onChange({ ...draft, googleAllowedDomains: e.target.value })}
                placeholder="st.vju.ac.vn"
                className="h-9 font-mono text-xs"
              />
            </FormField>

            <FormField
              label="Tự tạo tài khoản qua Google"
              hint="GOOGLE_CREATE_ACCOUNTS áp dụng tại trang đăng ký"
            >
              <Select
                disabled={!canEdit}
                value={googleModeValue}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    ...draft,
                    googleCreateAccounts: val === "env" ? null : val === "true",
                  });
                }}
                className="h-9 text-xs"
              >
                <option value="env">Theo cấu hình .env</option>
                <option value="true">Cho phép tự tạo tài khoản</option>
                <option value="false">Chỉ đăng nhập tài khoản đã cấp</option>
              </Select>
            </FormField>
          </div>
        </div>
      </div>
    </section>
  );
}
