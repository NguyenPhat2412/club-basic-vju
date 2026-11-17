"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { Compass, Eye, FilterX, MapPin, UserCheck, XCircle } from "lucide-react";
import { apiModel, MyEventParticipation, PublicEvent } from "@/lib/api";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { BreadcrumbToolbar, SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";
import { EVENT_TYPE_LABELS } from "@/forms/event/event-form";
import { EventParticipationDrawers } from "./EventParticipationDrawers";
import { MyEventsHistorySection } from "./MyEventsHistorySection";

export function EventsPortalView() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <EventsPortalContent />
    </Suspense>
  );
}

function EventsPortalContent() {
  const searchParams = useSearchParams();
  const requestedEventId = searchParams.get("eventId");
  const session = useOptionalSession();
  const queryClient = useQueryClient();
  const isLoggedIn = !!session.user;

  const [tab, setTab] = useState<"discover" | "mine">("discover");
  const [search, setSearch] = useState("");
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
  const [regNote, setRegNote] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [now] = useState(() => Date.now());

  const publicEvents = useQuery({
    queryKey: qk.eventsPortal("public"),
    queryFn: () => apiModel.publicEvents(0, 50),
  });

  const memberships = useQuery({
    queryKey: qk.eventsPortal("memberships"),
    queryFn: () => apiModel.myMemberships({ status: "ACTIVE", limit: 50 }),
    enabled: isLoggedIn,
  });

  const activeClubIds = useMemo(
    () => new Set((memberships.data?.items ?? []).filter((m) => m.status === "ACTIVE").map((m) => m.clubId)),
    [memberships.data?.items],
  );

  const memberClubEventQueries = useQueries({
    queries: [...activeClubIds].map((clubId) => ({
      queryKey: qk.eventsPortal("club-events", clubId),
      queryFn: () => apiModel.clubEvents(clubId, { limit: 50 }),
      enabled: isLoggedIn,
    })),
  });

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
      if (item.registrationStatus === "REGISTERED") {
        map.set(item.eventId, item);
      }
    }
    return map;
  }, [myAllActiveRegs.data?.items]);

  const discoverList = useMemo(() => {
    const merged = new Map<string, PublicEvent>();
    for (const ev of publicEvents.data?.items ?? []) {
      merged.set(ev.id, ev);
    }
    for (const q of memberClubEventQueries) {
      for (const ev of q.data?.items ?? []) {
        if (ev.status !== "DRAFT") {
          merged.set(ev.id, ev);
        }
      }
    }
    const qLower = search.trim().toLowerCase();
    return [...merged.values()]
      .filter((ev) => {
        if (ctvFilter === "CTV_ONLY" && !ev.allowCtv) return false;
        if (typeFilter && ev.eventType !== typeFilter) return false;
        if (!qLower) return true;
        return ev.title.toLowerCase().includes(qLower) || ev.clubName.toLowerCase().includes(qLower) || (ev.location ?? "").toLowerCase().includes(qLower);
      })
      .sort((a, b) => b.startTime.localeCompare(a.startTime));
  }, [publicEvents.data?.items, memberClubEventQueries, search, ctvFilter, typeFilter]);

  const pagedDiscover = useMemo(() => discoverList.slice(discoverOffset, discoverOffset + discoverLimit), [discoverList, discoverOffset, discoverLimit]);
  const hasDiscoverFilters = Boolean(search.trim() || ctvFilter !== "ALL" || typeFilter);
  const clearDiscoverFilters = () => { setSearch(""); setCtvFilter("ALL"); setTypeFilter(""); setDiscoverOffset(0); };

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
    mutationFn: (ev: PublicEvent) => apiModel.registerEvent(ev.id, regNote.trim() || undefined),
    onSuccess: (reg, ev) => {
      const roleLabel = reg.participantType === "CTV" ? "Cộng tác viên (CTV)" : "Thành viên CLB";
      setNotice(`Đã đăng ký tham gia "${ev.title}" với tư cách ${roleLabel}.`);
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
    const isMember = activeClubIds.has(ev.clubId);
    return isMember || ev.allowCtv;
  };

  const canCancelNow = (eventStatus: string, registrationStatus: string, deadline?: string) => {
    if (registrationStatus !== "REGISTERED") return false;
    if (eventStatus !== "OPEN_REGISTRATION") return false;
    if (deadline && new Date(deadline).getTime() < now) return false;
    return true;
  };

  return (
    <ListPage title="Sự kiện & Cộng tác viên">
      <BreadcrumbToolbar
        crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Cổng cá nhân" }, { label: "Sự kiện & CTV" }]}
        titleBadge={
          <CountBadge>
            {tab === "discover" ? `${discoverList.length} sự kiện` : `${myHistory.data?.total ?? 0} lượt tham gia`}
          </CountBadge>
        }
        search={tab === "discover" ? { value: search, onChange: (v) => { setSearch(v); setDiscoverOffset(0); }, placeholder: "Tìm tên sự kiện, CLB, địa điểm…" } : undefined}
        extraActions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {isLoggedIn && (
              <SegmentedTabs
                value={tab}
                onChange={(v) => { setTab(v); setNotice(""); setErrorMsg(""); }}
                options={[
                  { value: "discover", label: "Khám phá sự kiện" },
                  { value: "mine", label: "Sự kiện & Điểm danh của tôi" },
                ]}
              />
            )}
            {tab === "discover" && (
              <>
                <Select aria-label="Lọc loại sự kiện" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setDiscoverOffset(0); }} className="h-9 w-full text-xs sm:w-44">
                  <option value="">Mọi loại hình</option>
                  {Object.entries(EVENT_TYPE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </Select>
                <Select aria-label="Lọc đối tượng sự kiện" value={ctvFilter} onChange={(e) => { setCtvFilter(e.target.value as "ALL" | "CTV_ONLY"); setDiscoverOffset(0); }} className="h-9 w-full text-xs sm:w-48">
                  <option value="ALL">Tất cả sự kiện mở</option>
                  <option value="CTV_ONLY">Mở tuyển Cộng tác viên (CTV)</option>
                </Select>
                {hasDiscoverFilters && (
                  <Button size="sm" variant="outline" onClick={clearDiscoverFilters}><FilterX size={14} /> Xoá lọc</Button>
                )}
              </>
            )}
          </div>
        }
        onRefresh={refreshAll}
      />

      {notice && <Notice tone="success">{notice}</Notice>}
      {errorMsg && <Notice tone="error">{errorMsg}</Notice>}

      {tab === "discover" ? (
        publicEvents.isPending ? (
          <LoadingRows />
        ) : publicEvents.isError ? (
          <ErrorState message={describeError(publicEvents.error)} onRetry={() => publicEvents.refetch()} />
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
                      <p className="font-bold text-foreground">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">{ev.clubName} · {EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}</p>
                    </div>
                  ),
                },
                {
                  key: "audience",
                  header: "Đối tượng",
                  sortValue: (ev) => Number(ev.allowCtv),
                  render: (ev) => ev.allowCtv ? <Badge tone="pending">Mở cho SV & CTV</Badge> : <Badge tone="neutral">Nội bộ thành viên CLB</Badge>,
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
                        {myReg && <Badge tone="primary">Đã ĐK ({myReg.participantType === "CTV" ? "CTV" : "TV"})</Badge>}
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
                    const actions = [
                      { icon: <Eye />, label: "Xem chi tiết", onClick: () => setSelectedDiscover(ev) },
                      ...(isLoggedIn && myReg && canCancelNow(ev.status, myReg.registrationStatus, ev.registrationDeadline)
                        ? [{ icon: <XCircle />, label: "Huỷ đăng ký", danger: true, disabled: cancelMutation.isPending, onClick: () => cancelMutation.mutate(ev.id) }]
                        : isLoggedIn && !myReg && canRegisterNow(ev)
                          ? [{ icon: <UserCheck />, label: activeClubIds.has(ev.clubId) ? "Đăng ký tham gia" : "Đăng ký CTV", onClick: () => { setRegisteringEvent(ev); setRegNote(""); registerMutation.reset(); } }]
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
          items={myHistory.data?.items ?? []}
          total={myHistory.data?.total ?? 0}
          activeRegistrationsCount={activeRegByEvent.size}
          isPending={myHistory.isPending}
          isError={myHistory.isError}
          error={myHistory.error}
          onRetry={() => myHistory.refetch()}
          regStatusFilter={regStatusFilter}
          setRegStatusFilter={setRegStatusFilter}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          historyOffset={historyOffset}
          setHistoryOffset={setHistoryOffset}
          historyLimit={historyLimit}
          setHistoryLimit={setHistoryLimit}
          onDiscoverTab={() => setTab("discover")}
          onSelectParticipation={setSelectedParticipation}
          canCancelNow={canCancelNow}
          cancelPending={cancelMutation.isPending}
          onCancelRegistration={(eventId) => cancelMutation.mutate(eventId)}
        />
      )}

      <EventParticipationDrawers
        isLoggedIn={isLoggedIn}
        activeClubIds={activeClubIds}
        activeRegByEvent={activeRegByEvent}
        registeringEvent={registeringEvent}
        setRegisteringEvent={setRegisteringEvent}
        regNote={regNote}
        setRegNote={setRegNote}
        selectedDiscover={activeSelectedDiscover}
        setSelectedDiscover={handleSetSelectedDiscover}
        selectedParticipation={selectedParticipation}
        setSelectedParticipation={setSelectedParticipation}
        canRegisterNow={canRegisterNow}
        canCancelNow={canCancelNow}
        registerPending={registerMutation.isPending}
        onRegister={(ev) => registerMutation.mutate(ev)}
        cancelPending={cancelMutation.isPending}
        onCancel={(eventId) => cancelMutation.mutate(eventId)}
      />
    </ListPage>
  );
}
