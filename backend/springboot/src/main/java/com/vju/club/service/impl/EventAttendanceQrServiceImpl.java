package com.vju.club.service.impl;

import com.vju.club.common.EventConstants;
import com.vju.club.dto.request.QrAttendanceCheckInRequest;
import com.vju.club.dto.response.EventAttendanceQrTokenResponse;
import com.vju.club.dto.response.EventAttendanceResponse;
import com.vju.club.entity.Event;
import com.vju.club.entity.EventAttendance;
import com.vju.club.entity.User;
import com.vju.club.enums.AttendanceStatus;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.EventRegistrationStatus;
import com.vju.club.enums.EventStatus;
import com.vju.club.enums.EventType;
import com.vju.club.enums.MembershipStatus;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.EventMapper;
import com.vju.club.repository.EventAttendanceRepository;
import com.vju.club.repository.EventRegistrationRepository;
import com.vju.club.repository.EventRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.AuditService;
import com.vju.club.service.EventAttendanceQrService;
import com.vju.club.service.SystemSettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class EventAttendanceQrServiceImpl implements EventAttendanceQrService {
    private static final String VERSION = "v1";
    private static final String HMAC_ALG = "HmacSHA256";
    private static final int DEFAULT_TTL_SECONDS = 1_800; // 30 minutes
    private static final String QR_CHECK_IN_NOTE = "Điểm danh qua mã QR";

    private final EventRepository eventRepository;
    private final EventRegistrationRepository registrationRepository;
    private final EventAttendanceRepository attendanceRepository;
    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final PermissionAuthorizationService authorizationService;
    private final SystemSettingsService systemSettingsService;
    private final AuditService auditService;
    private final EventMapper eventMapper;
    private final Clock clock;
    private final byte[] hmacKey;

    @Autowired
    public EventAttendanceQrServiceImpl(
            EventRepository eventRepository,
            EventRegistrationRepository registrationRepository,
            EventAttendanceRepository attendanceRepository,
            MembershipRepository membershipRepository,
            UserRepository userRepository,
            PermissionAuthorizationService authorizationService,
            SystemSettingsService systemSettingsService,
            AuditService auditService,
            EventMapper eventMapper,
            Clock clock,
            @Value("${app.qr.secret:}") String configuredSecret) {
        this.eventRepository = eventRepository;
        this.registrationRepository = registrationRepository;
        this.attendanceRepository = attendanceRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
        this.authorizationService = authorizationService;
        this.systemSettingsService = systemSettingsService;
        this.auditService = auditService;
        this.eventMapper = eventMapper;
        this.clock = clock != null ? clock : Clock.systemUTC();
        if (configuredSecret != null && configuredSecret.strip().length() >= 16) {
            this.hmacKey = configuredSecret.strip().getBytes(StandardCharsets.UTF_8);
        } else {
            byte[] generated = new byte[32];
            new SecureRandom().nextBytes(generated);
            this.hmacKey = generated;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public EventAttendanceQrTokenResponse issueQrToken(Actor actor, UUID eventId) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        UUID clubId = event.getClub().getId();
        UUID deptId = event.getDepartment() == null ? null : event.getDepartment().getId();
        boolean canRecord = authorizationService.hasPermission(actor, EventConstants.PERMISSION_ATTENDANCE, clubId, deptId)
                || authorizationService.hasPermission(actor, EventConstants.PERMISSION_ATTENDANCE_EDIT, clubId, deptId);
        if (!canRecord) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }

        OffsetDateTime now = OffsetDateTime.now(clock);
        validateEventAttendanceWindow(event, now);

        OffsetDateTime expiresAt = now.plusSeconds(DEFAULT_TTL_SECONDS);
        String payload = VERSION + "." + event.getId() + "." + actor.id() + "." + expiresAt.toEpochSecond();
        String signature = signBase64Url(payload);
        return new EventAttendanceQrTokenResponse(
                event.getId(),
                event.getTitle(),
                payload + "." + signature,
                expiresAt,
                DEFAULT_TTL_SECONDS);
    }

    @Override
    @Transactional
    public EventAttendanceResponse checkInWithQr(Actor actor, UUID eventId, QrAttendanceCheckInRequest request) {
        ParsedQrToken parsed = verifyToken(eventId, request.token());

        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        OffsetDateTime now = OffsetDateTime.now(clock);
        validateEventAttendanceWindow(event, now);

        UUID clubId = event.getClub().getId();
        User participant = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        boolean registered = registrationRepository.findByEvent_IdAndUser_IdAndStatus(
                eventId, participant.getId(), EventRegistrationStatus.REGISTERED).isPresent();
        boolean memberAtMeeting = event.getEventType() == EventType.MEETING
                && membershipRepository.existsByUser_IdAndClub_IdAndStatus(
                        participant.getId(), clubId, MembershipStatus.ACTIVE);
        if (!registered && !memberAtMeeting) {
            throw new ApiException(HttpStatus.CONFLICT, "PARTICIPANT_NOT_REGISTERED",
                    "Bạn chưa đăng ký tham gia sự kiện này nên chưa thể điểm danh QR");
        }

        Optional<EventAttendance> existingOpt = attendanceRepository.findByEvent_IdAndUser_Id(eventId, participant.getId());
        if (existingOpt.isPresent()) {
            EventAttendance existing = existingOpt.get();
            if (existing.getStatus() == AttendanceStatus.PRESENT || existing.getStatus() == AttendanceStatus.LATE) {
                return eventMapper.toAttendanceResponse(existing);
            }
            User checker = userRepository.findById(parsed.issuedByUserId()).orElse(participant);
            existing.setStatus(AttendanceStatus.PRESENT);
            existing.setNote(QR_CHECK_IN_NOTE);
            existing.setEditReason(QR_CHECK_IN_NOTE);
            existing.setCheckedBy(checker);
            existing.setCheckedAt(now);
            EventAttendance updated = attendanceRepository.saveAndFlush(existing);
            auditService.record(actor.id(), AuditAction.EVENT_ATTENDANCE_RECORDED, event.getId(), clubId,
                    null, Map.of("count", 1, "method", "QR"));
            return eventMapper.toAttendanceResponse(updated);
        }

        User checker = userRepository.findById(parsed.issuedByUserId()).orElse(participant);
        EventAttendance created = new EventAttendance();
        created.setEvent(event);
        created.setUser(participant);
        created.setStatus(AttendanceStatus.PRESENT);
        created.setNote(QR_CHECK_IN_NOTE);
        created.setCheckedBy(checker);
        created.setCheckedAt(now);
        EventAttendance saved = attendanceRepository.saveAndFlush(created);
        auditService.record(actor.id(), AuditAction.EVENT_ATTENDANCE_RECORDED, event.getId(), clubId,
                null, Map.of("count", 1, "method", "QR"));
        return eventMapper.toAttendanceResponse(saved);
    }

    private void validateEventAttendanceWindow(Event event, OffsetDateTime now) {
        if (event.getStatus() == EventStatus.DRAFT || event.getStatus() == EventStatus.CANCELLED) {
            throw new ApiException(HttpStatus.CONFLICT, "EVENT_NOT_HELD",
                    "Attendance cannot be recorded for a draft or cancelled event");
        }
        if (event.getAttendanceLockedAt() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "ATTENDANCE_LOCKED",
                    "Bảng điểm danh sự kiện đã được chốt và ký xác nhận, không thể điểm danh QR");
        }
        int opensBeforeMinutes = systemSettingsService != null
                ? systemSettingsService.current().attendanceOpensBeforeMinutes()
                : 120;
        if (now.isBefore(event.getStartTime().minusMinutes(opensBeforeMinutes))) {
            throw new ApiException(HttpStatus.CONFLICT, "EVENT_NOT_STARTED",
                    "Attendance opens " + opensBeforeMinutes + " minutes before the event starts");
        }
        if (event.getStatus() == EventStatus.COMPLETED) {
            OffsetDateTime completedRef = event.getCompletedAt() != null ? event.getCompletedAt() : event.getEndTime();
            int windowHours = systemSettingsService != null
                    ? systemSettingsService.current().attendanceEditWindowHours()
                    : 48;
            if (now.isAfter(completedRef.plusHours(windowHours))) {
                throw new ApiException(HttpStatus.CONFLICT, "ATTENDANCE_EDIT_WINDOW_EXPIRED",
                        "Attendance edit window has expired");
            }
        }
    }

    private ParsedQrToken verifyToken(UUID expectedEventId, String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "QR_TOKEN_INVALID", "Invalid QR attendance token");
        }
        String trimmed = rawToken.strip();
        String[] parts = trimmed.split("\\.");
        if (parts.length != 5 || !VERSION.equals(parts[0])) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "QR_TOKEN_INVALID", "Invalid QR attendance token");
        }
        String payload = parts[0] + "." + parts[1] + "." + parts[2] + "." + parts[3];
        byte[] expectedSig = signRaw(payload);
        byte[] actualSig;
        try {
            actualSig = Base64.getUrlDecoder().decode(parts[4]);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "QR_TOKEN_INVALID", "Invalid QR attendance token");
        }
        if (!MessageDigest.isEqual(expectedSig, actualSig)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "QR_TOKEN_INVALID", "Invalid QR attendance token");
        }

        UUID tokenEventId;
        UUID issuerId;
        long expiresEpochSec;
        try {
            tokenEventId = UUID.fromString(parts[1]);
            issuerId = UUID.fromString(parts[2]);
            expiresEpochSec = Long.parseLong(parts[3]);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "QR_TOKEN_INVALID", "Invalid QR attendance token");
        }

        if (!expectedEventId.equals(tokenEventId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "QR_TOKEN_INVALID", "QR token belongs to a different event");
        }
        long nowEpochSec = OffsetDateTime.now(clock).toEpochSecond();
        if (nowEpochSec > expiresEpochSec) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "QR_TOKEN_EXPIRED", "Mã QR điểm danh đã hết hạn, vui lòng quét mã mới");
        }
        return new ParsedQrToken(tokenEventId, issuerId, expiresEpochSec);
    }

    private String signBase64Url(String payload) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(signRaw(payload));
    }

    private byte[] signRaw(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALG);
            mac.init(new SecretKeySpec(hmacKey, HMAC_ALG));
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Failed to compute HMAC-SHA256 for QR token", ex);
        }
    }

    private record ParsedQrToken(UUID eventId, UUID issuedByUserId, long expiresEpochSec) {
    }
}
