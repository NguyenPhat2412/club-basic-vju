package com.vju.club.service.impl;

import com.vju.club.common.EventConstants;
import com.vju.club.dto.request.LockEventAttendanceRequest;
import com.vju.club.dto.response.EventResponse;
import com.vju.club.entity.Event;
import com.vju.club.entity.EventAttendance;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.EventStatus;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.EventMapper;
import com.vju.club.repository.EventAttendanceRepository;
import com.vju.club.repository.EventRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.AuditService;
import com.vju.club.service.TwoFactorOtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventAttendanceLockServiceImpl {
    private static final String LOCK_ACTION_PREFIX = "EVENT_ATTENDANCE_LOCK:";

    private final EventRepository eventRepository;
    private final EventAttendanceRepository attendanceRepository;
    private final PermissionAuthorizationService authorizationService;
    private final AuditService auditService;
    private final EventMapper eventMapper;
    private final Clock clock;

    @Autowired(required = false)
    private TwoFactorOtpService twoFactorOtpService;

    @Transactional
    public EventResponse lockAttendance(Actor actor, UUID eventId, LockEventAttendanceRequest request) {
        Event event = eventRepository.lockById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        UUID clubId = event.getClub().getId();
        UUID deptId = event.getDepartment() == null ? null : event.getDepartment().getId();

        boolean allowed = authorizationService.hasPermission(actor, EventConstants.PERMISSION_ATTENDANCE_EDIT, clubId, deptId)
                || authorizationService.hasPermission(actor, EventConstants.PERMISSION_UPDATE, clubId, deptId);
        if (!allowed) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        if (event.getStatus() == EventStatus.DRAFT || event.getStatus() == EventStatus.CANCELLED) {
            throw new ApiException(HttpStatus.CONFLICT, "EVENT_NOT_HELD",
                    "Không thể chốt điểm danh cho sự kiện nháp hoặc đã huỷ");
        }
        if (event.getAttendanceLockedAt() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "ATTENDANCE_LOCKED",
                    "Bảng điểm danh sự kiện đã được chốt và ký xác nhận trước đó");
        }

        if (twoFactorOtpService != null) {
            twoFactorOtpService.requireCriticalActionOtpIfEnabled(
                    actor.id(),
                    LOCK_ACTION_PREFIX + eventId,
                    request != null ? request.otpCode() : null
            );
        }

        List<EventAttendance> sortedAttendances = attendanceRepository.findByEvent_IdOrderByCheckedAtAsc(eventId).stream()
                .sorted(Comparator.comparing(a -> a.getUser().getId().toString()))
                .toList();
        String signature = computeCanonicalSha256(eventId, sortedAttendances);

        OffsetDateTime now = OffsetDateTime.now(clock);
        event.setAttendanceLockedAt(now);
        event.setAttendanceLockedBy(actor.id());
        event.setAttendanceSignatureSha256(signature);
        Event saved = eventRepository.saveAndFlush(event);

        Map<String, Object> after = new LinkedHashMap<>();
        after.put("action", "ATTENDANCE_LOCKED");
        after.put("attendanceLockedAt", now);
        after.put("attendanceLockedBy", actor.id());
        after.put("attendanceSignatureSha256", signature);
        after.put("attendeeCount", sortedAttendances.size());
        auditService.record(actor.id(), AuditAction.EVENT_ATTENDANCE_UPDATED, saved.getId(), clubId, null, after);

        Event reloaded = eventRepository.findWithRelationsById(saved.getId()).orElse(saved);
        return eventMapper.toResponse(reloaded);
    }

    static String computeCanonicalSha256(UUID eventId, List<EventAttendance> sortedAttendances) {
        StringBuilder canonical = new StringBuilder();
        canonical.append(eventId).append('\n');
        for (EventAttendance att : sortedAttendances) {
            String userId = att.getUser().getId().toString();
            String studentCode = att.getUser().getStudentCode() == null ? "" : att.getUser().getStudentCode().strip();
            String status = att.getStatus().name();
            String checkedAtUtcIso = att.getCheckedAt() == null
                    ? ""
                    : DateTimeFormatter.ISO_INSTANT.format(att.getCheckedAt().toInstant());
            canonical.append(userId).append('|')
                    .append(studentCode).append('|')
                    .append(status).append('|')
                    .append(checkedAtUtcIso).append('\n');
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(canonical.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", ex);
        }
    }
}
