package com.vju.club.modules.event.service.impl;

import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.config.CacheConfig;
import com.vju.club.error.ApiException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.modules.departmentmember.repository.DepartmentMemberRepository;
import com.vju.club.modules.event.common.EventConstants;
import com.vju.club.modules.event.dto.request.AttendanceItemRequest;
import com.vju.club.modules.event.dto.request.CreateEventRequest;
import com.vju.club.modules.event.dto.request.EventRegistrationRequest;
import com.vju.club.modules.event.dto.request.RecordAttendanceRequest;
import com.vju.club.modules.event.dto.request.UpdateEventRequest;
import com.vju.club.modules.event.dto.response.CalendarItemResponse;
import com.vju.club.modules.event.dto.response.EventAttendanceResponse;
import com.vju.club.modules.event.dto.response.EventRegistrationResponse;
import com.vju.club.modules.event.dto.response.EventResponse;
import com.vju.club.modules.event.entity.Event;
import com.vju.club.modules.event.entity.EventAttendance;
import com.vju.club.modules.event.entity.EventRegistration;
import com.vju.club.modules.event.enums.EventParticipantType;
import com.vju.club.modules.event.enums.EventRegistrationStatus;
import com.vju.club.modules.event.enums.EventStatus;
import com.vju.club.modules.event.enums.EventType;
import com.vju.club.modules.event.mapper.EventMapper;
import com.vju.club.modules.event.repository.EventAttendanceRepository;
import com.vju.club.modules.event.repository.EventRegistrationRepository;
import com.vju.club.modules.event.repository.EventRepository;
import com.vju.club.modules.event.service.EventService;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.modules.notification.service.NotificationService;
import com.vju.club.modules.permission.annotation.RequirePermission;
import com.vju.club.modules.task.entity.Task;
import com.vju.club.modules.task.repository.TaskRepository;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventServiceImpl implements EventService {
    private static final Sort EVENT_SORT = Sort.by(Sort.Order.desc("startTime"), Sort.Order.asc("id"));
    private static final Sort REGISTRATION_SORT = Sort.by(Sort.Order.asc("registeredAt"), Sort.Order.asc("id"));

    private static final Set<EventStatus> PUBLIC_STATUSES = Set.of(EventStatus.OPEN_REGISTRATION,
            EventStatus.CLOSED_REGISTRATION, EventStatus.COMPLETED);
    private static final Map<EventStatus, Set<EventStatus>> ALLOWED_TRANSITIONS = Map.of(
            EventStatus.DRAFT, Set.of(EventStatus.OPEN_REGISTRATION, EventStatus.CANCELLED),
            EventStatus.OPEN_REGISTRATION, Set.of(EventStatus.CLOSED_REGISTRATION, EventStatus.COMPLETED, EventStatus.CANCELLED),
            EventStatus.CLOSED_REGISTRATION, Set.of(EventStatus.OPEN_REGISTRATION, EventStatus.COMPLETED, EventStatus.CANCELLED));
    private static final Duration ATTENDANCE_OPENS_BEFORE_START = Duration.ofHours(2);
    private static final Duration MAX_CALENDAR_RANGE = Duration.ofDays(366);

    private final EventRepository eventRepository;
    private final EventRegistrationRepository registrationRepository;
    private final EventAttendanceRepository attendanceRepository;
    private final TaskRepository taskRepository;
    private final ClubRepository clubRepository;
    private final DepartmentRepository departmentRepository;
    private final MembershipRepository membershipRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final UserRepository userRepository;
    private final PermissionAuthorizationService authorizationService;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final Clock clock;
    private final EventMapper eventMapper;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.CACHE_PUBLIC_EVENTS, key = "#offset + ':' + #limit")
    public PageResponse<EventResponse> listPublic(int offset, int limit) {
        var page = eventRepository.findPublicEvents(new OffsetLimitRequest(offset, limit, EVENT_SORT));
        List<EventResponse> items = page.getContent().stream()
                .map(eventMapper::toResponse)
                .toList();
        return new PageResponse<>(items, page.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional
    @RequirePermission(value = EventConstants.PERMISSION_CREATE, clubId = "clubId")
    @CacheEvict(cacheNames = CacheConfig.CACHE_PUBLIC_EVENTS, allEntries = true)
    public EventResponse create(Actor actor, UUID clubId, CreateEventRequest request) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }

        Department department = null;
        if (request.departmentId() != null) {
            department = departmentRepository.findById(request.departmentId())
                    .filter(d -> d.getClub().getId().equals(clubId))
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DEPARTMENT_NOT_FOUND", "Department not found in club"));
        }

        validateTimes(request.startTime(), request.endTime(), request.registrationDeadline());
        OffsetDateTime createdAt = OffsetDateTime.now(clock);
        if (!request.startTime().isAfter(createdAt) || !request.registrationDeadline().isAfter(createdAt)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_EVENT_TIME",
                    "A new event must start, and close registration, in the future");
        }

        Event event = new Event();
        event.setClub(club);
        event.setDepartment(department);
        event.setTitle(request.title().strip());
        event.setDescription(request.description() == null ? null : request.description().strip());
        event.setEventType(request.eventType() == null ? EventType.CLUB_EVENT : request.eventType());
        event.setLocation(request.location() == null ? null : request.location().strip());
        event.setStartTime(request.startTime());
        event.setEndTime(request.endTime());
        event.setRegistrationDeadline(request.registrationDeadline());
        event.setAllowCtv(Boolean.TRUE.equals(request.allowCtv()));
        event.setMaxParticipants(request.maxParticipants());
        EventStatus initialStatus = request.status() == null ? EventStatus.OPEN_REGISTRATION : request.status();
        if (initialStatus != EventStatus.DRAFT && initialStatus != EventStatus.OPEN_REGISTRATION) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_EVENT_STATUS",
                    "New events must start in DRAFT or OPEN_REGISTRATION status");
        }
        event.setStatus(initialStatus);

        Event saved = eventRepository.save(event);
        if (saved.getStatus() == EventStatus.OPEN_REGISTRATION) {
            notifyClubMembers(club, department, saved);
        }

        auditService.record(actor.id(), AuditAction.EVENT_CREATED, saved.getId(), club.getId(), null, snapshot(saved));
        return eventMapper.toResponse(saved);
    }

    @Override
    @Transactional
    @RequirePermission(value = EventConstants.PERMISSION_UPDATE, clubId = "clubId")
    @CacheEvict(cacheNames = CacheConfig.CACHE_PUBLIC_EVENTS, allEntries = true)
    public EventResponse update(Actor actor, UUID clubId, UUID eventId, UpdateEventRequest request) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .filter(e -> e.getClub().getId().equals(clubId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));

        Map<String, Object> before = snapshot(event);
        EventStatus previousStatus = event.getStatus();

        if (request.departmentId() != null) {
            Department department = departmentRepository.findById(request.departmentId())
                    .filter(d -> d.getClub().getId().equals(clubId))
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DEPARTMENT_NOT_FOUND", "Department not found in club"));
            event.setDepartment(department);
        }
        if (request.title() != null) {
            String stripped = request.title().strip();
            if (stripped.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_EVENT_TITLE", "Event title cannot be blank");
            }
            event.setTitle(stripped);
        }
        if (request.description() != null) {
            event.setDescription(request.description().strip());
        }
        if (request.eventType() != null) {
            event.setEventType(request.eventType());
        }
        if (request.location() != null) {
            event.setLocation(request.location().strip());
        }
        OffsetDateTime startTime = request.startTime() != null ? request.startTime() : event.getStartTime();
        OffsetDateTime endTime = request.endTime() != null ? request.endTime() : event.getEndTime();
        OffsetDateTime deadline = request.registrationDeadline() != null ? request.registrationDeadline() : event.getRegistrationDeadline();
        validateTimes(startTime, endTime, deadline);
        event.setStartTime(startTime);
        event.setEndTime(endTime);
        event.setRegistrationDeadline(deadline);

        if (request.allowCtv() != null) {
            event.setAllowCtv(request.allowCtv());
        }
        if (request.maxParticipants() != null) {
            long registered = registrationRepository.countByEvent_IdAndStatus(eventId, EventRegistrationStatus.REGISTERED);
            if (request.maxParticipants() < registered) {
                throw new ApiException(HttpStatus.CONFLICT, "MAX_PARTICIPANTS_TOO_LOW",
                        "maxParticipants cannot be lower than the " + registered + " people already registered");
            }
            event.setMaxParticipants(request.maxParticipants());
        }
        if (request.status() != null && request.status() != previousStatus) {
            if (!ALLOWED_TRANSITIONS.getOrDefault(previousStatus, Set.of()).contains(request.status())) {
                throw new ApiException(HttpStatus.CONFLICT, "INVALID_EVENT_STATUS_TRANSITION",
                        "An event cannot move from " + previousStatus + " to " + request.status());
            }
            event.setStatus(request.status());
        }

        Event saved = eventRepository.save(event);
        if (previousStatus == EventStatus.DRAFT && saved.getStatus() == EventStatus.OPEN_REGISTRATION) {
            notifyClubMembers(saved.getClub(), saved.getDepartment(), saved);
        }
        if (previousStatus != EventStatus.CANCELLED && saved.getStatus() == EventStatus.CANCELLED) {
            for (UUID userId : registrationRepository.findRegisteredUserIds(saved.getId())) {
                notificationService.create(userId, "Sự kiện đã huỷ: " + saved.getTitle(),
                        "Sự kiện \"" + saved.getTitle() + "\" của CLB " + saved.getClub().getName() + " đã bị huỷ.",
                        saved.getId());
            }
        }
        auditService.recordChange(actor.id(), AuditAction.EVENT_UPDATED, saved.getId(), clubId, before, snapshot(saved));
        return eventMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<EventResponse> listForClub(Actor actor, UUID clubId, EventStatus status, UUID departmentId,
                                                   int offset, int limit) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
        boolean canViewAll = authorizationService.hasPermission(actor, EventConstants.PERMISSION_VIEW, club.getId(), departmentId)
                || authorizationService.hasPermission(actor, "club.view", club.getId(), null)
                || membershipRepository.existsByUser_IdAndClub_IdAndStatus(actor.id(), club.getId(), MembershipStatus.ACTIVE);
        EventStatus effectiveStatus = canViewAll ? status : EventStatus.OPEN_REGISTRATION;
        var page = eventRepository.findByClub(club.getId(), effectiveStatus, departmentId,
                new OffsetLimitRequest(offset, limit, EVENT_SORT));
        return new PageResponse<>(page.getContent().stream().map(eventMapper::toResponse).toList(),
                page.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public EventResponse get(Actor actor, UUID eventId) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        UUID clubId = event.getClub().getId();
        boolean publiclyVisible = event.getClub().getStatus() == ClubStatus.ACTIVE
                && PUBLIC_STATUSES.contains(event.getStatus());
        boolean canView = publiclyVisible
                || authorizationService.hasPermission(actor, EventConstants.PERMISSION_VIEW, clubId, null)
                || authorizationService.hasPermission(actor, "club.view", clubId, null)
                || membershipRepository.existsByUser_IdAndClub_IdAndStatus(actor.id(), clubId, MembershipStatus.ACTIVE);
        if (!canView) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        return eventMapper.toResponse(event);
    }

    @Override
    @Transactional
    public EventRegistrationResponse register(Actor actor, UUID eventId, EventRegistrationRequest request) {
        eventRepository.lockById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        if (event.getClub().getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        if (event.getStatus() != EventStatus.OPEN_REGISTRATION || now.isAfter(event.getRegistrationDeadline())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "REGISTRATION_CLOSED",
                    "Event registration is closed or past the deadline");
        }
        if (registrationRepository.findByEvent_IdAndUser_IdAndStatus(
                eventId, actor.id(), EventRegistrationStatus.REGISTERED).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_REGISTERED",
                    "User has already registered for this event");
        }

        boolean isClubMember = membershipRepository.existsByUser_IdAndClub_IdAndStatus(
                actor.id(), event.getClub().getId(), MembershipStatus.ACTIVE);
        if (!isClubMember && !event.isAllowCtv()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED",
                    "Only club members can register for this event");
        }
        if (event.getMaxParticipants() != null) {
            long currentCount = registrationRepository.countByEvent_IdAndStatus(eventId, EventRegistrationStatus.REGISTERED);
            if (currentCount >= event.getMaxParticipants()) {
                throw new ApiException(HttpStatus.CONFLICT, "EVENT_FULL", "Event has reached maximum participants");
            }
        }

        User user = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        EventRegistration registration = new EventRegistration();
        registration.setEvent(event);
        registration.setUser(user);
        registration.setParticipantType(isClubMember ? EventParticipantType.MEMBER : EventParticipantType.CTV);
        registration.setStatus(EventRegistrationStatus.REGISTERED);
        registration.setNote(request == null || request.note() == null ? null : request.note().strip());
        registration.setRegisteredAt(now);

        EventRegistration saved = registrationRepository.save(registration);
        notificationService.create(user.getId(),
                "Đăng ký sự kiện thành công",
                "Bạn đã đăng ký tham gia sự kiện \"" + event.getTitle() + "\".",
                event.getId());
        auditService.record(actor.id(), AuditAction.EVENT_REGISTERED, event.getId(), event.getClub().getId(),
                null, Map.of("userId", user.getId(), "participantType", saved.getParticipantType()));
        return eventMapper.toRegistrationResponse(saved);
    }

    @Override
    @Transactional
    public EventRegistrationResponse cancelRegistration(Actor actor, UUID eventId) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        EventRegistration registration = registrationRepository.findByEvent_IdAndUser_IdAndStatus(
                        eventId, actor.id(), EventRegistrationStatus.REGISTERED)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REGISTRATION_NOT_FOUND",
                        "Active registration not found"));
        OffsetDateTime now = OffsetDateTime.now(clock);
        if (event.getStatus() != EventStatus.OPEN_REGISTRATION || now.isAfter(event.getRegistrationDeadline())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "REGISTRATION_CLOSED",
                    "Cannot cancel registration after deadline or when registration is closed");
        }

        registration.setStatus(EventRegistrationStatus.CANCELLED);
        registration.setCancelledAt(now);
        EventRegistration saved = registrationRepository.save(registration);
        auditService.record(actor.id(), AuditAction.EVENT_REGISTRATION_CANCELLED, event.getId(), event.getClub().getId(),
                Map.of("status", EventRegistrationStatus.REGISTERED), Map.of("status", EventRegistrationStatus.CANCELLED));
        return eventMapper.toRegistrationResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<EventRegistrationResponse> listRegistrations(Actor actor, UUID eventId, int offset, int limit) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        UUID clubId = event.getClub().getId();
        UUID deptId = event.getDepartment() == null ? null : event.getDepartment().getId();
        boolean allowed = authorizationService.hasPermission(actor, EventConstants.PERMISSION_VIEW, clubId, deptId)
                || authorizationService.hasPermission(actor, EventConstants.PERMISSION_ATTENDANCE, clubId, deptId);
        if (!allowed) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        var page = registrationRepository.findByEvent_IdOrderByRegisteredAtAsc(
                eventId, new OffsetLimitRequest(offset, limit, REGISTRATION_SORT));
        return new PageResponse<>(page.getContent().stream().map(eventMapper::toRegistrationResponse).toList(),
                page.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional
    public List<EventAttendanceResponse> recordAttendance(Actor actor, UUID eventId, RecordAttendanceRequest request) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        UUID clubId = event.getClub().getId();
        UUID deptId = event.getDepartment() == null ? null : event.getDepartment().getId();
        authorizationService.require(actor, EventConstants.PERMISSION_ATTENDANCE, clubId, deptId);

        User checker = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        OffsetDateTime now = OffsetDateTime.now(clock);
        if (event.getStatus() == EventStatus.DRAFT || event.getStatus() == EventStatus.CANCELLED) {
            throw new ApiException(HttpStatus.CONFLICT, "EVENT_NOT_HELD", "Attendance cannot be recorded for a draft or cancelled event");
        }
        if (now.isBefore(event.getStartTime().minus(ATTENDANCE_OPENS_BEFORE_START))) {
            throw new ApiException(HttpStatus.CONFLICT, "EVENT_NOT_STARTED",
                    "Attendance opens " + ATTENDANCE_OPENS_BEFORE_START.toHours() + " hours before the event starts");
        }
        List<EventAttendanceResponse> results = new ArrayList<>();

        for (AttendanceItemRequest item : request.items()) {
            User participant = userRepository.findById(item.userId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Participant not found"));
            boolean registered = registrationRepository.findByEvent_IdAndUser_IdAndStatus(
                    eventId, participant.getId(), EventRegistrationStatus.REGISTERED).isPresent();
            boolean memberAtMeeting = event.getEventType() == EventType.MEETING
                    && membershipRepository.existsByUser_IdAndClub_IdAndStatus(participant.getId(), clubId, MembershipStatus.ACTIVE);
            if (!registered && !memberAtMeeting) {
                throw new ApiException(HttpStatus.CONFLICT, "PARTICIPANT_NOT_REGISTERED",
                        "Attendance can only be recorded for people registered for this event");
            }
            EventAttendance attendance = attendanceRepository.findByEvent_IdAndUser_Id(eventId, participant.getId())
                    .orElseGet(() -> {
                        EventAttendance created = new EventAttendance();
                        created.setEvent(event);
                        created.setUser(participant);
                        return created;
                    });
            attendance.setStatus(item.status());
            attendance.setNote(item.note() == null ? null : item.note().strip());
            attendance.setCheckedBy(checker);
            attendance.setCheckedAt(now);
            results.add(eventMapper.toAttendanceResponse(attendanceRepository.save(attendance)));
        }

        auditService.record(actor.id(), AuditAction.EVENT_ATTENDANCE_RECORDED, event.getId(), clubId,
                null, Map.of("count", results.size()));
        return results;
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventAttendanceResponse> listAttendances(Actor actor, UUID eventId) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        UUID clubId = event.getClub().getId();
        UUID deptId = event.getDepartment() == null ? null : event.getDepartment().getId();
        boolean allowed = authorizationService.hasPermission(actor, EventConstants.PERMISSION_ATTENDANCE, clubId, deptId)
                || authorizationService.hasPermission(actor, EventConstants.PERMISSION_VIEW, clubId, deptId);
        if (!allowed) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        return attendanceRepository.findByEvent_IdOrderByCheckedAtAsc(eventId).stream()
                .map(eventMapper::toAttendanceResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CalendarItemResponse> getMyCalendar(Actor actor, OffsetDateTime from, OffsetDateTime to) {
        OffsetDateTime start = from != null ? from : OffsetDateTime.now(clock).minusDays(7);
        OffsetDateTime end = to != null ? to : OffsetDateTime.now(clock).plusDays(30);
        if (start.isAfter(end)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TIME_RANGE", "Start time must not be after end time");
        }
        if (Duration.between(start, end).compareTo(MAX_CALENDAR_RANGE) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TIME_RANGE", "The calendar range cannot exceed 366 days");
        }

        Set<UUID> clubIds = new LinkedHashSet<>(membershipRepository.findActiveClubIdsByUserId(actor.id()));
        clubIds.addAll(authorizationService.getPermittedClubIds(actor, EventConstants.PERMISSION_VIEW));
        clubIds.addAll(authorizationService.getPermittedClubIds(actor, "club.view"));
        if (clubIds.isEmpty()) {
            clubIds.add(new UUID(0L, 0L));
        }
        Set<UUID> registeredIds = new LinkedHashSet<>(registrationRepository.findRegisteredEventIdsByUserId(actor.id()));
        if (registeredIds.isEmpty()) {
            registeredIds.add(new UUID(0L, 0L));
        }

        List<CalendarItemResponse> items = new ArrayList<>();
        for (Event event : eventRepository.findCalendarEvents(clubIds, registeredIds, start, end)) {
            items.add(new CalendarItemResponse(
                    event.getId(),
                    "EVENT",
                    event.getClub().getId(),
                    event.getClub().getName(),
                    event.getDepartment() == null ? null : event.getDepartment().getId(),
                    event.getTitle(),
                    event.getStatus().name(),
                    event.getLocation(),
                    event.getStartTime(),
                    event.getEndTime()
            ));
        }
        for (Task task : taskRepository.findCalendarTasks(actor.id(), start, end)) {
            items.add(new CalendarItemResponse(
                    task.getId(),
                    "TASK_DEADLINE",
                    task.getClub().getId(),
                    task.getClub().getName(),
                    task.getDepartment() == null ? null : task.getDepartment().getId(),
                    task.getTitle(),
                    task.getStatus().name(),
                    null,
                    task.getDeadline(),
                    task.getDeadline()
            ));
        }
        items.sort(Comparator.comparing(CalendarItemResponse::startTime));
        return items;
    }

    private static void validateTimes(OffsetDateTime startTime, OffsetDateTime endTime, OffsetDateTime registrationDeadline) {
        if (!startTime.isBefore(endTime) || registrationDeadline.isAfter(startTime)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_EVENT_TIME",
                    "Event startTime must be before endTime and registrationDeadline must not be after startTime");
        }
    }

    private void notifyClubMembers(Club club, Department department, Event event) {
        List<UUID> recipientIds = department != null
                ? departmentMemberRepository.findActiveUserIdsByDepartmentId(department.getId())
                : membershipRepository.findActiveUserIdsByClubId(club.getId());
        String title = "Sự kiện mới: " + event.getTitle();
        String message = "CLB " + club.getName() + " vừa mở đăng ký sự kiện \"" + event.getTitle() + "\".";
        for (UUID recipientId : recipientIds) {
            notificationService.create(recipientId, title, message, event.getId());
        }
    }

    private static Map<String, Object> snapshot(Event event) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("title", event.getTitle());
        values.put("eventType", event.getEventType());
        values.put("status", event.getStatus());
        values.put("startTime", event.getStartTime());
        values.put("endTime", event.getEndTime());
        values.put("registrationDeadline", event.getRegistrationDeadline());
        values.put("allowCtv", event.isAllowCtv());
        return values;
    }
}
