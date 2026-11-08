"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Compass, Eye, MapPin, UserCheck, XCircle } from "lucide-react";
import { apiModel, MyEventParticipation, PublicEvent } from "@/lib/api";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { BreadcrumbToolbar, SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";
import { EVENT_TYPE_LABELS } from "@/forms/event/event-form";
import { EventParticipationDrawers } from "./EventParticipationDrawers";
import { MyEventsHistorySection } from "./MyEventsHistorySection";

const HISTORY_LIMIT = 20;

export function EventsPortalView() {
  const session = useOptionalSession();
  const queryClient = useQueryClient();
  const isLoggedIn = !!session.user;

  const [tab, setTab] = useState<"discover" | "mine">("discover");
  const [search, setSearch] = useState("");
  const [ctvFilter, setCtvFilter] = useState<"ALL" | "CTV_ONLY">("ALL");
  const [regStatusFilter, setRegStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [historyOffset, setHistoryOffset] = useState(0);

  const [selectedDiscover, setSelectedDiscover] = useState<PublicEvent | null>(null);
  const [selectedParticipation, setSelectedParticipation] = useState<MyEventParticipation | null>(null);
  const [registeringEvent, setRegisteringEvent] = useState<PublicEvent | null>(null);
  const [regNote, setRegNote] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [now] = useState(() => Date.now());

  const publicEvents = useQuery({
    queryKey: ["events-portal", "public"],
    queryFn: () => apiModel.publicEvents(0, 50),
  });

  const memberships = useQuery({
    queryKey: ["events-portal", "memberships"],
    queryFn: () => apiModel.myMemberships({ status: "ACTIVE", limit: 50 }),
    enabled: isLoggedIn,
  });

  const activeClubIds = useMemo(
    () => new Set((memberships.data?.items ?? []).filter((m) => m.status === "ACTIVE").map((m) => m.clubId)),
    [memberships.data?.items],
  );

  const memberClubEventQueries = useQueries({
    queries: [...activeClubIds].map((clubId) => ({
      queryKey: ["events-portal", "club-events", clubId],
      queryFn: () => apiModel.clubEvents(clubId, { limit: 50 }),
      enabled: isLoggedIn,
    })),
  });

  const myHistory = useQuery({
    queryKey: ["my-event-registrations", regStatusFilter, roleFilter, historyOffset],
    queryFn: () =>
      apiModel.myEventRegistrations({
        status: regStatusFilter || undefined,
        participantType: roleFilter || undefined,
        offset: historyOffset,
        limit: HISTORY_LIMIT,
      }),
    enabled: isLoggedIn,
  });

  const myAllActiveRegs = useQuery({
    queryKey: ["my-event-registrations", "active-lookup"],
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
        if (!qLower) return true;
        return (
          ev.title.toLowerCase().includes(qLower) ||
          ev.clubName.toLowerCase().includes(qLower) ||
          (ev.location ?? "").toLowerCase().includes(qLower)
        );
      })
      .sort((a, b) => b.startTime.localeCompare(a.startTime));
  }, [publicEvents.data?.items, memberClubEventQueries, search, ctvFilter]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["events-portal"] });
    queryClient.invalidateQueries({ queryKey: ["my-event-registrations"] });
    queryClient.invalidateQueries({ queryKey: ["my-calendar"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
        search={
          tab === "discover"
            ? {
                value: search,
                onChange: setSearch,
                placeholder: "Tìm tên sự kiện, CLB, địa điểm…",
              }
            : undefined
        }
        extraActions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {isLoggedIn && (
              <SegmentedTabs
                value={tab}
                onChange={(v) => {
                  setTab(v);
                  setNotice("");
                  setErrorMsg("");
                }}
                options={[
                  { value: "discover", label: "Khám phá sự kiện" },
                  { value: "mine", label: "Sự kiện & Điểm danh của tôi" },
                ]}
              />
            )}
            {tab === "discover" && (
              <Select
                aria-label="Lọc đối tượng sự kiện"
                value={ctvFilter}
                onChange={(e) => setCtvFilter(e.target.value as "ALL" | "CTV_ONLY")}
                className="h-9 w-full text-xs sm:w-48"
              >
                <option value="ALL">Tất cả sự kiện mở</option>
                <option value="CTV_ONLY">Mở tuyển Cộng tác viên (CTV)</option>
              </Select>
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
          />
        ) : (
          <DataTable
            ariaLabel="Danh sách sự kiện khám phá"
            rows={discoverList}
            rowKey={(ev) => ev.id}
            onRowClick={setSelectedDiscover}
            columns={[
              {
                key: "time",
                header: "Thời gian",
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
                render: (ev) => (
                  <div>
                    <p className="font-bold text-foreground">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ev.clubName} · {EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}
                    </p>
                  </div>
                ),
              },
              {
                key: "audience",
                header: "Đối tượng",
                render: (ev) =>
                  ev.allowCtv ? (
                    <Badge tone="pending">Mở cho SV & CTV</Badge>
                  ) : (
                    <Badge tone="neutral">Nội bộ thành viên CLB</Badge>
                  ),
              },
              {
                key: "location",
                header: "Địa điểm",
                render: (ev) => (
                  <span className="text-muted-foreground">
                    {ev.location ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} /> {ev.location}
                      </span>
                    ) : (
                      "—"
                    )}
                  </span>
                ),
              },
              {
                key: "deadline",
                header: "Hạn đăng ký",
                render: (ev) => <span className="font-mono text-xs">{formatDateTime(ev.registrationDeadline)}</span>,
              },
              {
                key: "status",
                header: "Trạng thái",
                render: (ev) => {
                  const myReg = activeRegByEvent.get(ev.id);
                  return (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={ev.status} />
                      {myReg && (
                        <Badge tone="primary">
                          Đã ĐK ({myReg.participantType === "CTV" ? "CTV" : "TV"})
                        </Badge>
                      )}
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
                      ? [
                          {
                            icon: <XCircle />,
                            label: "Huỷ đăng ký",
                            danger: true,
                            disabled: cancelMutation.isPending,
                            onClick: () => cancelMutation.mutate(ev.id),
                          },
                        ]
                      : isLoggedIn && !myReg && canRegisterNow(ev)
                        ? [
                            {
                              icon: <UserCheck />,
                              label: activeClubIds.has(ev.clubId) ? "Đăng ký tham gia" : "Đăng ký CTV",
                              onClick: () => {
                                setRegisteringEvent(ev);
                                setRegNote("");
                                registerMutation.reset();
                              },
                            },
                          ]
                        : []),
                  ];
                  return <TableRowActions actions={actions} />;
                },
              },
            ]}
          />
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
          historyLimit={HISTORY_LIMIT}
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
        selectedDiscover={selectedDiscover}
        setSelectedDiscover={setSelectedDiscover}
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
