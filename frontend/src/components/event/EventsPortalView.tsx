"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { Compass, Eye, MapPin, UserCheck, XCircle } from "lucide-react";
import { apiModel, Club, EventParticipantRole, MyEventParticipation, PublicEvent } from "@/lib/api";
import { participantRoleLabel } from "@/lib/club/youth-union";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { formatDateTime, formatDay } from "@/lib/utils";
import { EVENT_TYPE_LABELS, getEventScopeLabel, isEventPublic } from "@/forms/event/event-form";
import { EventParticipationDrawers } from "./EventParticipationDrawers";
import { EventsPortalToolbar } from "./EventsPortalToolbar";
import { EventQrSelfCheckInModal } from "./EventQrModals";
import { RequiresSubmissionBadge } from "./EventSubmissionBlock";
import { MyEventsHistorySection } from "./MyEventsHistorySection";
import { TrainingPointsReportDialog } from "./TrainingPointsReportDialog";

export function EventsPortalView() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <EventsPortalContent />
    </Suspense>
  );
}

function EventsPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedEventId = searchParams.get("eventId");
  const qrCheckinEventId = searchParams.get("checkin");
  const qrCheckinToken = searchParams.get("token");
  const session = useOptionalSession();
  const queryClient = useQueryClient();
  const isLoggedIn = !!session.user;

  const [tab, setTab] = useState<"discover" | "mine">("discover");
  const [search, setSearch] = useState("");
  const [clubFilter, setClubFilter] = useState("");
  const [ctvFilter, setCtvFilter] = useState<"ALL" | "CTV_ONLY">("ALL");
  const [typeFilter, setTypeFilter] = useState("");
  const [discoverOffset, setDiscoverOffset] = useState(0);
  const [discoverLimit, setDiscoverLimit] = useState(20);
  const [regStatusFilter, setRegStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyLimit, setHistoryLimit] = useState(20);

  const [selectedDiscover, setSelectedDiscover] = useState<PublicEvent | null>(null);
  const [closedDeepLinkId, setClosedDeepLinkId] = useState<string | null>(null);
  const [selectedParticipation, setSelectedParticipation] = useState<MyEventParticipation | null>(null);
  const [registeringEvent, setRegisteringEvent] = useState<PublicEvent | null>(null);
  const [manualQrOpen, setManualQrOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [dismissedQrKey, setDismissedQrKey] = useState<string | null>(null);
  const [regNote, setRegNote] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [now] = useState(() => Date.now());
  const urlQrKey = qrCheckinEventId && qrCheckinToken ? `${qrCheckinEventId}:${qrCheckinToken}` : null;
  const qrCheckinOpen = manualQrOpen || Boolean(urlQrKey && dismissedQrKey !== urlQrKey);

  const discoverEvents = useQuery({
    queryKey: qk.eventsPortal(isLoggedIn ? "discover" : "public", session.user?.id ?? "anon"),
    queryFn: () => (isLoggedIn ? apiModel.discoverEvents(0, 100) : apiModel.publicEvents(0, 100)),
  });

  const publicClubs = useQuery({
    queryKey: qk.publicClubs("events-portal-units"),
    queryFn: () => apiModel.publicClubs("", "", 0, 100),
    staleTime: 60_000,
  });

  const unitOptions = useMemo(() => {
    const map = new Map<string, Club>((publicClubs.data?.items ?? []).map((c) => [c.id, c]));
    for (const ev of discoverEvents.data?.items ?? []) {
      if (ev.clubId && !map.has(ev.clubId)) map.set(ev.clubId, { id: ev.clubId, code: "", name: ev.clubName, status: "ACTIVE" });
    }
    return Array.from(map.values()).sort((a, b) => {
      const aDtn = a.code?.toUpperCase() === "DOANVJU" ? 0 : 1;
      const bDtn = b.code?.toUpperCase() === "DOANVJU" ? 0 : 1;
      return aDtn !== bDtn ? aDtn - bDtn : a.name.localeCompare(b.name, "vi");
    });
  }, [publicClubs.data?.items, discoverEvents.data?.items]);

  const canViewTrainingPointsReport =
    isLoggedIn &&
    (["event.attendance", "event.attendance_edit", "event.update"].some((k) => session.can(k)) ||
      session.hasGlobal("user.view"));

  const memberships = useQuery({
    queryKey: qk.eventsPortal("memberships"),
    queryFn: () => apiModel.myMemberships({ status: "ACTIVE", limit: 50 }),
    enabled: isLoggedIn,
  });

  const activeClubIds = useMemo(
    () => new Set((memberships.data?.items ?? []).filter((m) => m.status === "ACTIVE").map((m) => m.clubId)),
    [memberships.data?.items],
  );

  const myHistory = useQuery({
    queryKey: qk.myEventRegistrations(regStatusFilter, roleFilter, historyOffset, historyLimit),
    queryFn: () =>
      apiModel.myEventRegistrations({
        status: regStatusFilter || undefined,
        participantType: roleFilter || undefined,
        offset: historyOffset,
        limit: historyLimit,
      }),
    enabled: isLoggedIn,
  });

  const myAllActiveRegs = useQuery({
    queryKey: qk.myEventRegistrations("active-lookup"),
    queryFn: () => apiModel.myEventRegistrations({ status: "REGISTERED", limit: 100 }),
    enabled: isLoggedIn,
  });

  const activeRegByEvent = useMemo(() => {
    const map = new Map<string, MyEventParticipation>();
    for (const item of myAllActiveRegs.data?.items ?? []) {
      if (item.registrationStatus === "REGISTERED") map.set(item.eventId, item);
    }
    return map;
  }, [myAllActiveRegs.data?.items]);

  const discoverList = useMemo(() => {
    const qLower = search.trim().toLowerCase();
    return [...(discoverEvents.data?.items ?? [])]
      .filter((ev) => {
        if (clubFilter && ev.clubId !== clubFilter) return false;
        if (ctvFilter === "CTV_ONLY" && !ev.allowCtv) return false;
        if (typeFilter && ev.eventType !== typeFilter) return false;
        if (!qLower) return true;
        return ev.title.toLowerCase().includes(qLower) || ev.clubName.toLowerCase().includes(qLower) || (ev.location ?? "").toLowerCase().includes(qLower);
      })
      .sort((a, b) => b.startTime.localeCompare(a.startTime));
  }, [discoverEvents.data?.items, search, clubFilter, ctvFilter, typeFilter]);

  const pagedDiscover = useMemo(() => discoverList.slice(discoverOffset, discoverOffset + discoverLimit), [discoverList, discoverOffset, discoverLimit]);
  const hasDiscoverFilters = Boolean(search.trim() || clubFilter || ctvFilter !== "ALL" || typeFilter);
  const clearDiscoverFilters = () => { setSearch(""); setClubFilter(""); setCtvFilter("ALL"); setTypeFilter(""); setDiscoverOffset(0); };

  const activeSelectedDiscover: PublicEvent | null =
    selectedDiscover ??
    (requestedEventId && closedDeepLinkId !== requestedEventId
      ? (discoverList.find((ev) => ev.id === requestedEventId) ?? null)
      : null);

  const handleSetSelectedDiscover = (ev: PublicEvent | null) => {
    if (!ev && requestedEventId) {
      setClosedDeepLinkId(requestedEventId);
    }
    setSelectedDiscover(ev);
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: qk.eventsPortal() });
    queryClient.invalidateQueries({ queryKey: qk.myEventRegistrations() });
    queryClient.invalidateQueries({ queryKey: qk.myCalendar() });
    queryClient.invalidateQueries({ queryKey: qk.dashboard() });
  };

  const registerMutation = useMutation({
    mutationFn: ({ ev, participantType, needsShuttleBus }: { ev: PublicEvent; participantType: EventParticipantRole; needsShuttleBus?: boolean }) =>
      apiModel.registerEvent(ev.id, regNote.trim() || undefined, participantType, needsShuttleBus),
    onSuccess: (reg, { ev }) => {
      setNotice(`Đã đăng ký tham gia "${ev.title}" với tư cách ${participantRoleLabel(reg.participantType)}.`);
      setErrorMsg("");
      setRegisteringEvent(null);
      setRegNote("");
      refreshAll();
    },
    onError: (err) => setErrorMsg(describeError(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: (eventId: string) => apiModel.cancelEventRegistration(eventId),
    onSuccess: () => {
      setNotice("Đã huỷ đăng ký tham gia sự kiện.");
      setErrorMsg("");
      setSelectedParticipation(null);
      refreshAll();
    },
    onError: (err) => setErrorMsg(describeError(err)),
  });

  const canRegisterNow = (ev: PublicEvent) => {
    if (ev.status !== "OPEN_REGISTRATION") return false;
    if (ev.registrationDeadline && new Date(ev.registrationDeadline).getTime() < now) return false;
    return activeClubIds.has(ev.clubId) || isEventPublic(ev);
  };

  const canCancelNow = (eventStatus: string, registrationStatus: string, deadline?: string) => {
    if (registrationStatus !== "REGISTERED") return false;
    if (eventStatus !== "OPEN_REGISTRATION") return false;
    if (deadline && new Date(deadline).getTime() < now) return false;
    return true;
  };

  return (
    <ListPage title="Sự kiện & Cộng tác viên">
      <EventsPortalToolbar
        tab={tab}
        onTabChange={(v) => { setTab(v); setNotice(""); setErrorMsg(""); }}
        isLoggedIn={isLoggedIn}
        canViewTrainingPointsReport={canViewTrainingPointsReport}
        discoverCount={discoverList.length}
        myHistoryTotal={myHistory.data?.total ?? 0}
        search={search}
        onSearchChange={(v) => { setSearch(v); setDiscoverOffset(0); }}
        clubFilter={clubFilter}
        onClubFilterChange={(v) => { setClubFilter(v); setDiscoverOffset(0); }}
        unitOptions={unitOptions}
        typeFilter={typeFilter}
        onTypeFilterChange={(v) => { setTypeFilter(v); setDiscoverOffset(0); }}
        ctvFilter={ctvFilter}
        onCtvFilterChange={(v) => { setCtvFilter(v); setDiscoverOffset(0); }}
        hasDiscoverFilters={hasDiscoverFilters}
        onClearFilters={clearDiscoverFilters}
        onOpenQr={() => setManualQrOpen(true)}
        onOpenReport={() => setReportOpen(true)}
        onRefresh={refreshAll}
      />

      {notice && <Notice tone="success">{notice}</Notice>}
      {errorMsg && <Notice tone="error">{errorMsg}</Notice>}

      {tab === "discover" ? (
        discoverEvents.isPending ? (
          <LoadingRows />
        ) : discoverEvents.isError ? (
          <ErrorState message={describeError(discoverEvents.error)} onRetry={() => discoverEvents.refetch()} />
        ) : !discoverList.length ? (
          <EmptyState
            icon={<Compass />}
            title="Chưa có sự kiện phù hợp với bộ lọc"
            description="Khi các câu lạc bộ mở đăng ký sự kiện hoặc tuyển Cộng tác viên (CTV), danh sách sẽ hiển thị tại đây."
            actionLabel={hasDiscoverFilters ? "Xoá bộ lọc" : undefined}
            onAction={hasDiscoverFilters ? clearDiscoverFilters : undefined}
          />
        ) : (
          <>
            <DataTable
              ariaLabel="Danh sách sự kiện khám phá"
              minWidth="min-w-[820px]"
              rows={pagedDiscover}
              rowKey={(ev) => ev.id}
              onRowClick={setSelectedDiscover}
              columns={[
                {
                  key: "time",
                  header: "Thời gian",
                  sortValue: (ev) => ev.startTime,
                  render: (ev) => (
                    <div>
                      <p className="font-mono font-bold text-primary">{formatDay(ev.startTime)}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {new Date(ev.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "title",
                  header: "Sự kiện & Câu lạc bộ",
                  sortValue: (ev) => ev.title,
                  render: (ev) => (
                    <div>
                      <p className="font-bold text-foreground">{ev.boothCode ? `[Gian ${ev.boothCode}] ` : ""}{ev.title}</p>
                      <p className="text-xs text-muted-foreground">{ev.clubName} · {EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}{(ev.childBoothCount ?? 0) > 0 ? ` · ${ev.childBoothCount} gian hàng` : ""}</p>
                    </div>
                  ),
                },
                {
                  key: "audience",
                  header: "Đối tượng",
                  sortValue: (ev) => Number(isEventPublic(ev)) * 2 + Number(ev.allowCtv),
                  render: (ev) => (
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge tone={isEventPublic(ev) ? "pending" : "neutral"}>
                        {isEventPublic(ev) ? getEventScopeLabel(ev) : "Nội bộ thành viên CLB"}
                      </Badge>
                      {ev.requiresSubmission && <RequiresSubmissionBadge />}
                    </div>
                  ),
                },
                {
                  key: "location",
                  header: "Địa điểm",
                  sortValue: (ev) => ev.location ?? "",
                  render: (ev) => <span className="text-muted-foreground">{ev.location ? <span className="inline-flex items-center gap-1"><MapPin size={12} /> {ev.location}</span> : "—"}</span>,
                },
                {
                  key: "deadline",
                  header: "Hạn đăng ký",
                  sortValue: (ev) => ev.registrationDeadline ?? "",
                  render: (ev) => <span className="font-mono text-xs">{formatDateTime(ev.registrationDeadline)}</span>,
                },
                {
                  key: "status",
                  header: "Trạng thái",
                  sortValue: (ev) => ev.status,
                  render: (ev) => {
                    const myReg = activeRegByEvent.get(ev.id);
                    return (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={ev.status} />
                        {myReg && <Badge tone="primary">Đã ĐK ({participantRoleLabel(myReg.participantType)})</Badge>}
                      </div>
                    );
                  },
                },
                {
                  key: "actions",
                  header: "Thao tác",
                  className: "text-right",
                  render: (ev) => {
                    const myReg = activeRegByEvent.get(ev.id);
                    const registerLabel = activeClubIds.has(ev.clubId)
                      ? "Đăng ký tham gia"
                      : ev.allowCtv && !(ev.allowPublicAttendees ?? ev.allowCtv)
                        ? "Đăng ký CTV"
                        : "Đăng ký tham dự";
                    const actions = [
                      { icon: <Eye />, label: "Xem chi tiết", onClick: () => setSelectedDiscover(ev) },
                      ...(isLoggedIn && myReg && canCancelNow(ev.status, myReg.registrationStatus, ev.registrationDeadline)
                        ? [{ icon: <XCircle />, label: "Huỷ đăng ký", danger: true, disabled: cancelMutation.isPending, onClick: () => cancelMutation.mutate(ev.id) }]
                        : isLoggedIn && !myReg && canRegisterNow(ev)
                          ? [{ icon: <UserCheck />, label: registerLabel, onClick: () => { setRegisteringEvent(ev); setRegNote(""); registerMutation.reset(); } }]
                          : []),
                    ];
                    return <TableRowActions actions={actions} />;
                  },
                },
              ]}
            />
            <Pagination offset={discoverOffset} limit={discoverLimit} total={discoverList.length} onOffset={setDiscoverOffset} onLimit={setDiscoverLimit} />
          </>
        )
      ) : (
        <MyEventsHistorySection
          items={myHistory.data?.items ?? []} total={myHistory.data?.total ?? 0} activeRegistrationsCount={activeRegByEvent.size}
          isPending={myHistory.isPending} isError={myHistory.isError} error={myHistory.error} onRetry={() => myHistory.refetch()}
          regStatusFilter={regStatusFilter} setRegStatusFilter={setRegStatusFilter} roleFilter={roleFilter} setRoleFilter={setRoleFilter}
          historyOffset={historyOffset} setHistoryOffset={setHistoryOffset} historyLimit={historyLimit} setHistoryLimit={setHistoryLimit}
          onDiscoverTab={() => setTab("discover")} onSelectParticipation={setSelectedParticipation}
          canCancelNow={canCancelNow} cancelPending={cancelMutation.isPending} onCancelRegistration={(eventId) => cancelMutation.mutate(eventId)}
        />
      )}

      <EventParticipationDrawers
        isLoggedIn={isLoggedIn} activeClubIds={activeClubIds} activeRegByEvent={activeRegByEvent}
        registeringEvent={registeringEvent} setRegisteringEvent={setRegisteringEvent} regNote={regNote} setRegNote={setRegNote}
        selectedDiscover={activeSelectedDiscover} setSelectedDiscover={handleSetSelectedDiscover}
        selectedParticipation={selectedParticipation} setSelectedParticipation={setSelectedParticipation}
        canRegisterNow={canRegisterNow} canCancelNow={canCancelNow}
        registerPending={registerMutation.isPending}
        onRegister={(ev, participantType, needsShuttleBus) => registerMutation.mutate({ ev, participantType, needsShuttleBus })}
        cancelPending={cancelMutation.isPending} onCancel={(eventId) => cancelMutation.mutate(eventId)}
        onRefresh={refreshAll} onNotice={setNotice} onError={setErrorMsg}
      />
      <EventQrSelfCheckInModal
        open={qrCheckinOpen}
        isLoggedIn={isLoggedIn}
        initialEventId={qrCheckinEventId}
        initialToken={qrCheckinToken}
        onClose={() => { setManualQrOpen(false); if (urlQrKey) { setDismissedQrKey(urlQrKey); router.replace("/events"); } }}
        onSuccess={() => { setNotice("Đã điểm danh sự kiện bằng mã QR thành công!"); refreshAll(); }}
        onRequestLogin={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("auth", "login");
          router.push(`/events?${params.toString()}`);
        }}
      />
      <TrainingPointsReportDialog
        key={reportOpen ? `open-${clubFilter || "all"}` : "closed"}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        clubs={unitOptions}
        initialClubId={clubFilter || undefined}
      />
    </ListPage>
  );
}
