package com.vju.club.service.impl;

import com.vju.club.annotation.RequirePermission;
import com.vju.club.common.EventConstants;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.config.CacheConfig;
import com.vju.club.dto.request.AttendanceItemRequest;
import com.vju.club.dto.request.CreateEventRequest;
import com.vju.club.dto.request.EventRegistrationRequest;
import com.vju.club.dto.request.RecordAttendanceRequest;
import com.vju.club.dto.request.UpdateEventRegistrationRequest;
import com.vju.club.dto.request.UpdateEventRequest;
import com.vju.club.dto.response.CalendarItemResponse;
import com.vju.club.dto.response.EventAttendanceResponse;
import com.vju.club.dto.response.EventRegistrationResponse;
import com.vju.club.dto.response.EventResponse;
import com.vju.club.dto.response.MyEventParticipationResponse;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.Department;
import com.vju.club.entity.Event;
import com.vju.club.entity.EventAttendance;
import com.vju.club.entity.EventRegistration;
import com.vju.club.entity.Task;
import com.vju.club.entity.User;
import com.vju.club.enums.AttendanceStatus;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.ClubStatus;
import com.vju.club.enums.EventParticipantType;
import com.vju.club.enums.EventRegistrationStatus;
import com.vju.club.enums.EventStatus;
import com.vju.club.enums.EventType;
import com.vju.club.enums.MembershipStatus;
import com.vju.club.enums.TaskStatus;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.EventMapper;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.repository.EventAttendanceRepository;
import com.vju.club.repository.EventRegistrationRepository;
import com.vju.club.repository.EventRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.TaskRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.AiTranslationService;
import com.vju.club.service.AuditService;
import com.vju.club.service.EventService;
import com.vju.club.service.NotificationService;
import com.vju.club.service.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
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
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventServiceImpl implements EventService {
    private static final Sort EVENT_SORT = Sort.by(Sort.Order.desc("startTime"), Sort.Order.asc("id"));
    private static final Sort REGISTRATION_SORT = Sort.by(Sort.Order.asc("registeredAt"), Sort.Order.asc("id"));
    private static final Sort MY_REGISTRATION_SORT = Sort.by(Sort.Order.desc("registeredAt"), Sort.Order.asc("id"));

    private static final Set<EventStatus> DETAIL_VISIBLE_STATUSES = Set.of(
            EventStatus.OPEN_REGISTRATION,
            EventStatus.CLOSED_REGISTRATION,
            EventStatus.COMPLETED,
            EventStatus.CANCELLED);
    private static final Map<EventStatus, Set<EventStatus>> ALLOWED_TRANSITIONS = Map.of(
            EventStatus.DRAFT, Set.of(EventStatus.OPEN_REGISTRATION, EventStatus.CANCELLED),
            EventStatus.OPEN_REGISTRATION, Set.of(EventStatus.CLOSED_REGISTRATION, EventStatus.COMPLETED, EventStatus.CANCELLED),
            EventStatus.CLOSED_REGISTRATION, Set.of(EventStatus.OPEN_REGISTRATION, EventStatus.COMPLETED, EventStatus.CANCELLED));
    private static final Set<TaskStatus> OPEN_TASK_STATUSES = Set.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS);
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
    private final SystemSettingsService systemSettingsService;
    private final AuditService auditService;
    private final Clock clock;
    private final EventMapper eventMapper;

    @Autowired(required = false)
    private AiTranslationService aiTranslationService;

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
        warmTranslateEvent(saved);
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
        OffsetDateTime now = OffsetDateTime.now(clock);

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
            if (request.status() == EventStatus.COMPLETED) {
                event.setCompletedAt(now);
            }
        }

        Event saved = eventRepository.save(event);
        if (previousStatus == EventStatus.DRAFT && saved.getStatus() == EventStatus.OPEN_REGISTRATION) {
            notifyClubMembers(saved.getClub(), saved.getDepartment(), saved);
        }
        if (previousStatus != EventStatus.CANCELLED && saved.getStatus() == EventStatus.CANCELLED) {
            for (UUID userId : registrationRepository.findRegisteredUserIds(saved.getId())) {
                notificationService.create(userId,
                        "Sự kiện đã huỷ: " + saved.getTitle(),
                        "Sự kiện \"" + saved.getTitle() + "\" của CLB " + saved.getClub().getName() + " đã bị huỷ.",
                        "EVENT",
                        saved.getId(),
                        "EVENT_CANCELLED:" + saved.getId());
            }
            cancelOpenTasksForCancelledEvent(saved, actor.id());
        }
        auditService.recordChange(actor.id(), AuditAction.EVENT_UPDATED, saved.getId(), clubId, before, snapshot(saved));
        warmTranslateEvent(saved);
        return eventMapper.toResponse(saved);
    }

    private void warmTranslateEvent(Event event) {
        if (aiTranslationService == null || event == null) return;
        List<String> texts = new ArrayList<>();
        if (event.getTitle() != null) texts.add(event.getTitle());
        if (event.getLocation() != null) texts.add(event.getLocation());
        if (event.getDescription() != null) texts.add(event.getDescription());
        aiTranslationService.warmTranslateAsync(texts);
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
                && DETAIL_VISIBLE_STATUSES.contains(event.getStatus());
        boolean canView = publiclyVisible
                || registrationRepository.existsByEvent_IdAndUser_Id(eventId, actor.id())
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
                "EVENT",
                event.getId(),
                null);
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
        returnOpenEventTasksToAssigner(event, registration.getUser(), actor.id());
        auditService.record(actor.id(), AuditAction.EVENT_REGISTRATION_CANCELLED, event.getId(), event.getClub().getId(),
                Map.of("status", EventRegistrationStatus.REGISTERED),
                Map.of("status", EventRegistrationStatus.CANCELLED, "userId", actor.id()));
        return eventMapper.toRegistrationResponse(saved);
    }

    @Override
    @Transactional
    public EventRegistrationResponse updateRegistration(Actor actor, UUID eventId, UUID registrationId,
                                                        UpdateEventRegistrationRequest request) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        UUID clubId = event.getClub().getId();
        UUID deptId = event.getDepartment() == null ? null : event.getDepartment().getId();
        authorizationService.require(actor, EventConstants.PERMISSION_UPDATE, clubId, deptId);

        if (event.getStatus() == EventStatus.CANCELLED) {
            throw new ApiException(HttpStatus.CONFLICT, "EVENT_CANCELLED", "Cannot modify participant registrations of a cancelled event");
        }

        EventRegistration registration = registrationRepository.findWithRelationsByIdAndEvent_Id(registrationId, eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REGISTRATION_NOT_FOUND", "Registration not found for this event"));

        Map<String, Object> before = registrationSnapshot(registration);
        OffsetDateTime now = OffsetDateTime.now(clock);

        if (request.eventRole() != null) {
            String strippedRole = request.eventRole().strip();
            registration.setEventRole(strippedRole.isEmpty() ? null : strippedRole);
        }
        if (request.note() != null) {
            String strippedNote = request.note().strip();
            registration.setNote(strippedNote.isEmpty() ? null : strippedNote);
        }
        if (request.status() != null && request.status() != registration.getStatus()) {
            if (request.status() == EventRegistrationStatus.CANCELLED) {
                registration.setStatus(EventRegistrationStatus.CANCELLED);
                registration.setCancelledAt(now);
                returnOpenEventTasksToAssigner(event, registration.getUser(), actor.id());
            } else if (request.status() == EventRegistrationStatus.REGISTERED) {
                if (event.getStatus() == EventStatus.COMPLETED) {
                    throw new ApiException(HttpStatus.CONFLICT, "EVENT_ALREADY_COMPLETED", "Cannot reinstate registration on a completed event");
                }
                if (registrationRepository.findByEvent_IdAndUser_IdAndStatus(
                        eventId, registration.getUser().getId(), EventRegistrationStatus.REGISTERED).isPresent()) {
                    throw new ApiException(HttpStatus.CONFLICT, "ALREADY_REGISTERED", "Participant already has an active registration");
                }
                if (event.getMaxParticipants() != null) {
                    long currentCount = registrationRepository.countByEvent_IdAndStatus(eventId, EventRegistrationStatus.REGISTERED);
                    if (currentCount >= event.getMaxParticipants()) {
                        throw new ApiException(HttpStatus.CONFLICT, "EVENT_FULL", "Event has reached maximum participants");
                    }
                }
                registration.setStatus(EventRegistrationStatus.REGISTERED);
                registration.setCancelledAt(null);
            }
        }

        EventRegistration saved = registrationRepository.save(registration);
        auditService.recordChange(actor.id(), AuditAction.EVENT_REGISTRATION_UPDATED, event.getId(), clubId,
                before, registrationSnapshot(saved));
        return eventMapper.toRegistrationResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MyEventParticipationResponse> listMyRegistrations(Actor actor, EventRegistrationStatus status,
                                                                          EventParticipantType participantType,
                                                                          int offset, int limit) {
        var page = registrationRepository.findByUser(actor.id(), status, participantType,
                new OffsetLimitRequest(offset, limit, MY_REGISTRATION_SORT));
        List<EventRegistration> registrations = page.getContent();
        if (registrations.isEmpty()) {
            return new PageResponse<>(List.of(), page.getTotalElements(), offset, limit);
        }

        Set<UUID> eventIds = registrations.stream().map(r -> r.getEvent().getId()).collect(Collectors.toSet());
        Map<UUID, EventAttendance> attendancesByEventId = attendanceRepository.findByUser_IdAndEvent_IdIn(actor.id(), eventIds)
                .stream()
                .collect(Collectors.toMap(a -> a.getEvent().getId(), Function.identity(), (a, b) -> b));

        List<MyEventParticipationResponse> items = new ArrayList<>(registrations.size());
        for (EventRegistration reg : registrations) {
            Event event = reg.getEvent();
            EventAttendance attendance = attendancesByEventId.get(event.getId());
            boolean countedAsAttended = event.getStatus() != EventStatus.CANCELLED
                    && reg.getStatus() == EventRegistrationStatus.REGISTERED
                    && attendance != null
                    && (attendance.getStatus() == AttendanceStatus.PRESENT || attendance.getStatus() == AttendanceStatus.LATE);
            items.add(new MyEventParticipationResponse(
                    reg.getId(),
                    event.getId(),
                    event.getClub().getId(),
                    event.getClub().getCode(),
                    event.getClub().getName(),
                    event.getTitle(),
                    event.getEventType().name(),
                    event.getStatus().name(),
                    event.getLocation(),
                    event.getStartTime(),
                    event.getEndTime(),
                    event.getRegistrationDeadline(),
                    reg.getParticipantType().name(),
                    reg.getEventRole(),
                    reg.getStatus().name(),
                    reg.getRegisteredAt(),
                    reg.getCancelledAt(),
                    attendance == null ? null : attendance.getStatus().name(),
                    attendance == null ? null : attendance.getNote(),
                    attendance == null ? null : attendance.getEditReason(),
                    attendance == null ? null : attendance.getCheckedAt(),
                    countedAsAttended
            ));
        }
        return new PageResponse<>(items, page.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<EventRegistrationResponse> listRegistrations(Actor actor, UUID eventId, int offset, int limit) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        UUID clubId = event.getClub().getId();
        UUID deptId = event.getDepartment() == null ? null : event.getDepartment().getId();
        boolean allowed = authorizationService.hasPermission(actor, EventConstants.PERMISSION_VIEW, clubId, deptId)
                || authorizationService.hasPermission(actor, EventConstants.PERMISSION_ATTENDANCE, clubId, deptId)
                || authorizationService.hasPermission(actor, EventConstants.PERMISSION_ATTENDANCE_EDIT, clubId, deptId);
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
        boolean hasBaseAttendance = authorizationService.hasPermission(actor, EventConstants.PERMISSION_ATTENDANCE, clubId, deptId);
        boolean hasAttendanceEdit = authorizationService.hasPermission(actor, EventConstants.PERMISSION_ATTENDANCE_EDIT, clubId, deptId);
        if (!hasBaseAttendance && !hasAttendanceEdit) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }

        User checker = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        OffsetDateTime now = OffsetDateTime.now(clock);
        if (event.getStatus() == EventStatus.DRAFT || event.getStatus() == EventStatus.CANCELLED) {
            throw new ApiException(HttpStatus.CONFLICT, "EVENT_NOT_HELD", "Attendance cannot be recorded for a draft or cancelled event");
        }
        int opensBeforeMinutes = systemSettingsService != null ? systemSettingsService.current().attendanceOpensBeforeMinutes() : 120;
        if (now.isBefore(event.getStartTime().minusMinutes(opensBeforeMinutes))) {
            throw new ApiException(HttpStatus.CONFLICT, "EVENT_NOT_STARTED",
                    "Attendance opens " + opensBeforeMinutes + " minutes before the event starts");
        }

        String strippedReason = request.reason() == null ? null : request.reason().strip();
        boolean postCompletion = event.getStatus() == EventStatus.COMPLETED;
        if (postCompletion) {
            if (!hasAttendanceEdit) {
                throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED",
                        "Post-completion attendance adjustment requires event.attendance_edit permission");
            }
            OffsetDateTime completedRef = event.getCompletedAt() != null ? event.getCompletedAt() : event.getEndTime();
            int windowHours = systemSettingsService.current().attendanceEditWindowHours();
            if (now.isAfter(completedRef.plusHours(windowHours))) {
                throw new ApiException(HttpStatus.CONFLICT, "ATTENDANCE_EDIT_WINDOW_EXPIRED",
                        "Attendance edit window (" + windowHours + " hours after completion) has expired");
            }
            if (strippedReason == null || strippedReason.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "ATTENDANCE_EDIT_REASON_REQUIRED",
                        "A non-blank reason is required when adjusting attendance on a completed event");
            }
        }

        List<EventAttendanceResponse> results = new ArrayList<>();
        int newlyRecordedCount = 0;

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

            Optional<EventAttendance> existingOpt = attendanceRepository.findByEvent_IdAndUser_Id(eventId, participant.getId());
            if (existingOpt.isPresent()) {
                if (!hasAttendanceEdit) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED",
                            "Modifying an existing attendance record requires event.attendance_edit permission");
                }
                if (strippedReason == null || strippedReason.isEmpty()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "ATTENDANCE_EDIT_REASON_REQUIRED",
                            "A non-blank reason is required when modifying an existing attendance record");
                }
                EventAttendance existing = existingOpt.get();
                if (item.expectedVersion() != null && !item.expectedVersion().equals(existing.getVersion())) {
                    throw new ApiException(HttpStatus.CONFLICT, "ATTENDANCE_VERSION_CONFLICT",
                            "Attendance record was modified concurrently; expected version "
                                    + item.expectedVersion() + " but found " + existing.getVersion());
                }
                Map<String, Object> before = attendanceSnapshot(existing);
                existing.setStatus(item.status());
                existing.setNote(item.note() == null ? null : item.note().strip());
                existing.setEditReason(strippedReason);
                existing.setCheckedBy(checker);
                existing.setCheckedAt(now);
                EventAttendance saved = attendanceRepository.saveAndFlush(existing);
                auditService.record(actor.id(), AuditAction.EVENT_ATTENDANCE_UPDATED, event.getId(), clubId,
                        before, attendanceSnapshot(saved));
                results.add(eventMapper.toAttendanceResponse(saved));
            } else {
                EventAttendance created = new EventAttendance();
                created.setEvent(event);
                created.setUser(participant);
                created.setStatus(item.status());
                created.setNote(item.note() == null ? null : item.note().strip());
                if (postCompletion) {
                    created.setEditReason(strippedReason);
                }
                created.setCheckedBy(checker);
                created.setCheckedAt(now);
                EventAttendance saved = attendanceRepository.saveAndFlush(created);
                if (postCompletion) {
                    auditService.record(actor.id(), AuditAction.EVENT_ATTENDANCE_UPDATED, event.getId(), clubId,
                            null, attendanceSnapshot(saved));
                } else {
                    newlyRecordedCount++;
                }
                results.add(eventMapper.toAttendanceResponse(saved));
            }
        }

        if (newlyRecordedCount > 0) {
            auditService.record(actor.id(), AuditAction.EVENT_ATTENDANCE_RECORDED, event.getId(), clubId,
                    null, Map.of("count", newlyRecordedCount));
        }
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
                || authorizationService.hasPermission(actor, EventConstants.PERMISSION_ATTENDANCE_EDIT, clubId, deptId)
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
            if (task.getStatus() == TaskStatus.CANCELLED) {
                continue;
            }
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

    private void cancelOpenTasksForCancelledEvent(Event event, UUID actorId) {
        List<Task> openTasks = taskRepository.findByEvent_IdAndStatusIn(event.getId(), OPEN_TASK_STATUSES);
        for (Task task : openTasks) {
            Map<String, Object> before = Map.of("status", task.getStatus(), "assigneeId", task.getAssignee().getId());
            task.setStatus(TaskStatus.CANCELLED);
            Task savedTask = taskRepository.save(task);
            notificationService.create(
                    savedTask.getAssignee().getId(),
                    "Nhiệm vụ đóng do huỷ sự kiện: " + savedTask.getTitle(),
                    "Nhiệm vụ \"" + savedTask.getTitle() + "\" đã tự động đóng do sự kiện \"" + event.getTitle() + "\" bị huỷ.",
                    "TASK",
                    savedTask.getId(),
                    "EVENT_TASK_CANCELLED:" + savedTask.getId());
            auditService.record(actorId, AuditAction.TASK_CANCELLED, savedTask.getId(), event.getClub().getId(),
                    before, Map.of("status", TaskStatus.CANCELLED, "reason", "EVENT_CANCELLED"));
        }
    }

    private void returnOpenEventTasksToAssigner(Event event, User participant, UUID actorId) {
        List<Task> openTasks = taskRepository.findByEvent_IdAndAssignee_IdAndStatusIn(
                event.getId(), participant.getId(), OPEN_TASK_STATUSES);
        for (Task task : openTasks) {
            Map<String, Object> before = Map.of("status", task.getStatus(), "assigneeId", participant.getId());
            task.setAssignee(task.getAssigner());
            task.setStatus(TaskStatus.TODO);
            task.setProgressPercent(0);
            Task savedTask = taskRepository.save(task);
            notificationService.create(
                    savedTask.getAssigner().getId(),
                    "Hoàn trả nhiệm vụ sự kiện: " + savedTask.getTitle(),
                    "Người tham gia \"" + participant.getFullName() + "\" đã huỷ đăng ký sự kiện \"" + event.getTitle()
                            + "\". Nhiệm vụ \"" + savedTask.getTitle() + "\" được hoàn trả để phân công lại.",
                    "TASK",
                    savedTask.getId(),
                    null);
            auditService.record(actorId, AuditAction.TASK_UPDATED, savedTask.getId(), event.getClub().getId(),
                    before, Map.of("status", TaskStatus.TODO, "assigneeId", savedTask.getAssigner().getId(),
                            "reason", "EVENT_REGISTRATION_CANCELLED"));
        }
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
            notificationService.create(recipientId, title, message, "EVENT", event.getId(), "EVENT_OPENED:" + event.getId());
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
        values.put("completedAt", event.getCompletedAt());
        return values;
    }

    private static Map<String, Object> registrationSnapshot(EventRegistration registration) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("registrationId", registration.getId());
        values.put("userId", registration.getUser().getId());
        values.put("participantType", registration.getParticipantType());
        values.put("eventRole", registration.getEventRole());
        values.put("status", registration.getStatus());
        values.put("note", registration.getNote());
        return values;
    }

    private static Map<String, Object> attendanceSnapshot(EventAttendance attendance) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("userId", attendance.getUser().getId());
        values.put("status", attendance.getStatus());
        values.put("note", attendance.getNote());
        values.put("editReason", attendance.getEditReason());
        values.put("version", attendance.getVersion());
        return values;
    }
}
