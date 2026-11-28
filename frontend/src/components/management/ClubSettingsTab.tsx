"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, HelpCircle, LayoutTemplate, Newspaper, Share2 } from "lucide-react";
import { apiModel, Club, Department } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { clubSlugFromCode, toApiMediaUrl } from "@/lib/media";
import { useSession } from "@/hooks/useSession";
import { useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { ClubFacebookSettingsCard } from "@/components/management/ClubFacebookSettingsCard";
import { ClubOnboardingGuideCard } from "@/components/management/ClubOnboardingGuideCard";
import { ClubOverviewCustomizer } from "@/components/management/ClubOverviewCustomizer";
import { ClubPostsPanel } from "@/components/management/ClubPostsPanel";
import { ClubProfileSettingsPanel } from "@/components/management/ClubProfileSettingsPanel";
import { cn } from "@/lib/utils";

type SettingsSectionKey = "profile" | "posts" | "facebook" | "appearance";

export function ClubSettingsTab({
  club,
  departments,
  onNotice,
  onError,
}: {
  club: Club;
  departments: Department[];
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const mediaCatalog = useClubMediaCatalog(true);
  const clubMedia = mediaCatalog.data?.clubs[clubSlugFromCode(club.code)];

  const canUpdateClub = session.canInClub("club.update", club.id);
  const canManageFacebook = session.canInClub("club.facebook.manage", club.id) || canUpdateClub;
  const canActivateClub = club.status !== "ACTIVE" && session.canInClub("club.active", club.id);
  const canDeactivateClub = club.status === "ACTIVE" && session.canInClub("club.inactive", club.id);
  const canEditProfile = canUpdateClub || canActivateClub || canDeactivateClub;
  const canSendNotif = session.canInClub("notification.send", club.id);

  const sections: { key: SettingsSectionKey; label: string; icon: React.ReactNode }[] = [
    ...(canEditProfile ? [{ key: "profile" as const, label: "Hồ sơ & Ảnh bìa", icon: <Building2 size={14} /> }] : []),
    ...(canUpdateClub ? [{ key: "posts" as const, label: "Bảng tin CLB", icon: <Newspaper size={14} /> }] : []),
    ...(canManageFacebook ? [{ key: "facebook" as const, label: "Fanpage Facebook", icon: <Share2 size={14} /> }] : []),
    ...(canUpdateClub ? [{ key: "appearance" as const, label: "Trang giới thiệu", icon: <LayoutTemplate size={14} /> }] : []),
  ];

  const urlSection = searchParams.get("section") as SettingsSectionKey | null;
  const hasFbReturn = Boolean(searchParams.get("fbSelect") || searchParams.get("fbError"));
  const initialSection: SettingsSectionKey =
    hasFbReturn && canManageFacebook
      ? "facebook"
      : urlSection && sections.some((s) => s.key === urlSection)
        ? urlSection
        : (sections[0]?.key ?? "profile");

  const [section, setSection] = useState<SettingsSectionKey>(initialSection);
  const [showGuide, setShowGuide] = useState(false);
  const activeSection: SettingsSectionKey = sections.some((s) => s.key === section)
    ? section
    : (sections[0]?.key ?? "profile");

  const [name, setName] = useState(club.name);
  const [activityField, setActivityField] = useState(club.activityField ?? "");
  const [contactEmail, setContactEmail] = useState(club.contactEmail ?? "");
  const [logoUrl, setLogoUrl] = useState(club.logoUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(club.coverUrl ?? "");
  const [description, setDescription] = useState(club.description ?? "");

  const followStatus = useQuery({
    queryKey: qk.publicClubFollowStatus(club.id),
    queryFn: () => apiModel.publicClubFollowStatus(club.id),
    staleTime: 30_000,
  });

  const refreshClubs = () => {
    queryClient.invalidateQueries({ queryKey: qk.clubs() });
    queryClient.invalidateQueries({ queryKey: qk.home("public-clubs") });
    queryClient.invalidateQueries({ queryKey: qk.dashboard("public-clubs") });
  };

  const saveClub = useMutation({
    mutationFn: () =>
      apiModel.updateClub(club.id, {
        name: name.trim(),
        activityField: activityField.trim(),
        contactEmail: contactEmail.trim() || undefined,
        logoUrl: toApiMediaUrl(logoUrl),
        coverUrl: toApiMediaUrl(coverUrl),
        description: description.trim(),
      }),
    onSuccess: (updated) => {
      onNotice(`Đã lưu hồ sơ câu lạc bộ "${updated.name}".`);
      onError("");
      refreshClubs();
    },
    onError: (e) => onError(describeError(e)),
  });

  const changeStatus = useMutation({
    mutationFn: (status: "ACTIVE" | "INACTIVE") => apiModel.updateClubStatus(club.id, status),
    onSuccess: (updated) => {
      onNotice(
        updated.status === "ACTIVE"
          ? `Đã kích hoạt lại câu lạc bộ "${updated.name}".`
          : `Đã ngừng hoạt động câu lạc bộ "${updated.name}".`,
      );
      onError("");
      refreshClubs();
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative z-30 flex min-h-10 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-white px-3 py-1.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-3.5 w-1 shrink-0 rounded-full bg-primary" />
          <span className="truncate text-[13px] font-bold text-slate-900">Trang & Cài đặt CLB</span>
          <Badge tone="primary" dot={false}>{club.code}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {sections.length > 0 && (
            <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Phân mục cài đặt CLB">
              {sections.map((item) => {
                const active = !showGuide && item.key === activeSection;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setShowGuide(false);
                      setSection(item.key);
                    }}
                    className={cn(
                      "inline-flex h-7.5 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                      active
                        ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/25"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            aria-pressed={showGuide}
            className={cn(
              "inline-flex h-7.5 items-center gap-1 rounded-lg border px-2 text-xs font-semibold transition-colors",
              showGuide
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <HelpCircle size={13} />
            <span>Hướng dẫn</span>
          </button>
        </div>
      </div>

      <div className="w-full flex-1 px-3 py-3 sm:px-5 sm:py-4">
        {showGuide ? (
          <ClubOnboardingGuideCard
            club={club}
            departments={departments}
            onSelectSection={(next) => {
              setShowGuide(false);
              setSection(next);
            }}
          />
        ) : (
          <>
            {activeSection === "profile" && canEditProfile && (
              <ClubProfileSettingsPanel
                club={club}
                clubMedia={clubMedia}
                followersCount={followStatus.data?.followersCount ?? 0}
                canUpdateClub={canUpdateClub}
                canActivateClub={canActivateClub}
                canDeactivateClub={canDeactivateClub}
                canSendNotif={canSendNotif}
                name={name}
                setName={setName}
                activityField={activityField}
                setActivityField={setActivityField}
                contactEmail={contactEmail}
                setContactEmail={setContactEmail}
                logoUrl={logoUrl}
                setLogoUrl={setLogoUrl}
                coverUrl={coverUrl}
                setCoverUrl={setCoverUrl}
                description={description}
                setDescription={setDescription}
                saving={saveClub.isPending}
                changingStatus={changeStatus.isPending}
                onSave={() => saveClub.mutate()}
                onChangeStatus={(s) => changeStatus.mutate(s)}
                onNotice={onNotice}
                onError={onError}
              />
            )}

            {activeSection === "posts" && canUpdateClub && (
              <ClubPostsPanel key={`posts-${club.id}`} club={club} onNotice={onNotice} onError={onError} />
            )}

            {activeSection === "facebook" && canManageFacebook && (
              <ClubFacebookSettingsCard
                key={`facebook-${club.id}`}
                club={club}
                onNotice={onNotice}
                onError={onError}
              />
            )}

            {activeSection === "appearance" && canUpdateClub && (
              <ClubOverviewCustomizer
                key={`customizer-${club.id}`}
                club={club}
                onSaved={refreshClubs}
                onNotice={onNotice}
                onError={onError}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
