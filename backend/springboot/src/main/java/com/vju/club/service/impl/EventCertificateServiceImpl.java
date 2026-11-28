package com.vju.club.service.impl;

import com.vju.club.common.ApiPaths;
import com.vju.club.common.CertificateConstants;
import com.vju.club.common.ClubConstants;
import com.vju.club.common.EventConstants;
import com.vju.club.config.CacheConfig;
import com.vju.club.dto.CertificateDtos.CertificateListResponse;
import com.vju.club.dto.CertificateDtos.CertificateManagementResponse;
import com.vju.club.dto.CertificateDtos.CertificateStatsSummary;
import com.vju.club.dto.CertificateDtos.CertificateTemplateResponse;
import com.vju.club.dto.CertificateDtos.ClubCertificateBreakdownItem;
import com.vju.club.dto.CertificateDtos.EventCertificateResponse;
import com.vju.club.dto.CertificateDtos.IssueCertificatesResponse;
import com.vju.club.dto.CertificateDtos.PublicCertificateVerificationResponse;
import com.vju.club.dto.CertificateDtos.RemindCertificatesRequest;
import com.vju.club.dto.CertificateDtos.RemindCertificatesResponse;
import com.vju.club.dto.CertificateDtos.RevokeCertificateRequest;
import com.vju.club.dto.record.ClubMediaContent;
import com.vju.club.dto.record.UploadedFile;
import com.vju.club.entity.Club;
import com.vju.club.entity.Event;
import com.vju.club.entity.EventAttendance;
import com.vju.club.entity.EventCertificate;
import com.vju.club.entity.EventRegistration;
import com.vju.club.entity.User;
import com.vju.club.enums.AttendanceStatus;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.CertificateStatus;
import com.vju.club.enums.EventParticipantType;
import com.vju.club.enums.EventRegistrationStatus;
import com.vju.club.enums.MembershipStatus;
import com.vju.club.error.ApiException;
import com.vju.club.repository.EventAttendanceRepository;
import com.vju.club.repository.EventCertificateRepository;
import com.vju.club.repository.EventRegistrationRepository;
import com.vju.club.repository.EventRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.AuditService;
import com.vju.club.service.EventCertificateService;
import com.vju.club.service.NotificationService;
import com.vju.club.service.OtpMailService;
import com.vju.club.storage.DocumentStorage;
import com.vju.club.storage.ImageUploads;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class EventCertificateServiceImpl implements EventCertificateService {
    private static final ZoneId VJU_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final char[] CODE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".toCharArray();
    private static final String CODE_SALT = "vju-ecert-v1";
    private static final String TEMPLATE_KEY_PREFIX = "certificate-templates/";
    private static final long TEMPLATE_MAX_BYTES = 8L * 1024 * 1024;
    private static final Pattern TEMPLATE_FILE_NAME = Pattern.compile(
            "^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}-[0-9a-f]{32}\\.(png|jpg|gif|webp)$");

    private final EventRepository eventRepository;
    private final EventAttendanceRepository attendanceRepository;
    private final EventRegistrationRepository registrationRepository;
    private final EventCertificateRepository certificateRepository;
    private final MembershipRepository membershipRepository;
    private final PermissionAuthorizationService authorizationService;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final DocumentStorage documentStorage;
    private final OtpMailService otpMailService;
    private final Clock clock;
    private final String publicApiBaseUrl;

    public EventCertificateServiceImpl(
            EventRepository eventRepository,
            EventAttendanceRepository attendanceRepository,
            EventRegistrationRepository registrationRepository,
            EventCertificateRepository certificateRepository,
            MembershipRepository membershipRepository,
            PermissionAuthorizationService authorizationService,
            NotificationService notificationService,
            AuditService auditService,
            DocumentStorage documentStorage,
            OtpMailService otpMailService,
            Clock clock,
            @Value("${app.public-api-base-url:http://localhost:${server.port:8080}}") String publicApiBaseUrl) {
        this.eventRepository = eventRepository;
        this.attendanceRepository = attendanceRepository;
        this.registrationRepository = registrationRepository;
        this.certificateRepository = certificateRepository;
        this.membershipRepository = membershipRepository;
        this.authorizationService = authorizationService;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.documentStorage = documentStorage;
        this.otpMailService = otpMailService;
        this.clock = clock;
        this.publicApiBaseUrl = publicApiBaseUrl.endsWith("/")
                ? publicApiBaseUrl.substring(0, publicApiBaseUrl.length() - 1) : publicApiBaseUrl;
    }

    @Override
    @Transactional
    public IssueCertificatesResponse issueForEvent(Actor actor, UUID eventId) {
        eventRepository.lockById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));

        Club club = event.getClub();
        UUID clubId = club.getId();
        UUID deptId = event.getDepartment() == null ? null : event.getDepartment().getId();

        requireCertificatePermission(actor, clubId, deptId, CertificateConstants.PERMISSION_ISSUE);
        if (event.getAttendanceLockedAt() == null) {
            throw new ApiException(HttpStatus.CONFLICT, "ATTENDANCE_NOT_LOCKED",
                    "Vui lòng chốt & ký khoá sổ điểm danh SHA-256 trước khi phát hành chứng nhận.");
        }

        List<EventRegistration> registrations = registrationRepository.findByEvent_Id(eventId);
        Set<UUID> usersWithAnyRegistration = new HashSet<>();
        Map<UUID, EventRegistration> activeRegByUserId = new HashMap<>();
        for (EventRegistration reg : registrations) {
            UUID uid = reg.getUser().getId();
            usersWithAnyRegistration.add(uid);
            if (reg.getStatus() == EventRegistrationStatus.REGISTERED) {
                activeRegByUserId.put(uid, reg);
            }
        }

        List<EventCertificate> existingCerts = certificateRepository.findByEvent_IdOrderByIssuedAtDesc(eventId);
        Set<UUID> existingUserIds = new HashSet<>();
        for (EventCertificate existing : existingCerts) {
            existingUserIds.add(existing.getUser().getId());
        }

        List<EventAttendance> attendances = attendanceRepository.findByEvent_IdOrderByCheckedAtAsc(eventId);
        OffsetDateTime now = OffsetDateTime.now(clock);
        int eventYear = event.getStartTime().atZoneSameInstant(VJU_ZONE).getYear();
        String sanitizedClubCode = sanitizeClubCode(club.getCode());

        List<EventCertificate> newlyCreated = new ArrayList<>();
        Set<String> pendingCodes = new HashSet<>();

        for (EventAttendance att : attendances) {
            if (att.getStatus() != AttendanceStatus.PRESENT && att.getStatus() != AttendanceStatus.LATE) {
                continue;
            }
            User user = att.getUser();
            UUID userId = user.getId();
            if (existingUserIds.contains(userId)) {
                continue;
            }

            EventRegistration activeReg = activeRegByUserId.get(userId);
            if (activeReg == null && usersWithAnyRegistration.contains(userId)) {
                continue;
            }

            EventParticipantType participantType;
            String eventRole;
            if (activeReg != null) {
                participantType = activeReg.getParticipantType();
                eventRole = activeReg.getEventRole();
            } else {
                boolean activeMember = membershipRepository.existsByUser_IdAndClub_IdAndStatus(
                        userId, clubId, MembershipStatus.ACTIVE);
                participantType = activeMember ? EventParticipantType.MEMBER : EventParticipantType.ATTENDEE;
                eventRole = null;
            }

            String certificateCode = generateUniqueCode(eventId, userId, eventYear, sanitizedClubCode, pendingCodes);
            pendingCodes.add(certificateCode);

            String studentCode = user.getStudentCode() == null ? null : user.getStudentCode().strip();
            String verificationSha256 = computeVerificationSha256(
                    certificateCode,
                    eventId,
                    userId,
                    studentCode,
                    participantType,
                    event.getAttendanceSignatureSha256()
            );

            EventCertificate cert = new EventCertificate();
            cert.setCertificateCode(certificateCode);
            cert.setEvent(event);
            cert.setClub(club);
            cert.setUser(user);
            cert.setParticipantType(participantType);
            cert.setEventRole(eventRole);
            cert.setAcademicTerm(event.getAcademicTerm());
            cert.setRecipientName(user.getFullName());
            cert.setStudentCode(studentCode);
            cert.setClubCode(club.getCode());
            cert.setClubName(club.getName());
            cert.setEventTitle(event.getTitle());
            cert.setEventStartTime(event.getStartTime());
            cert.setStatus(CertificateStatus.ISSUED);
            cert.setVerificationSha256(verificationSha256);
            cert.setTemplateImageUrl(event.getCertificateTemplateUrl());
            cert.setIssuedBy(actor.id());
            cert.setIssuedAt(now);
            newlyCreated.add(cert);
        }

        if (!newlyCreated.isEmpty()) {
            List<EventCertificate> saved = certificateRepository.saveAllAndFlush(newlyCreated);
            for (EventCertificate cert : saved) {
                notificationService.create(
                        cert.getUser().getId(),
                        "Chứng nhận tham gia: " + event.getTitle(),
                        "Bạn đã được cấp giấy chứng nhận điện tử mã " + cert.getCertificateCode()
                                + " cho sự kiện \"" + event.getTitle() + "\" của CLB " + club.getName()
                                + ". Vui lòng mở Hồ sơ cá nhân (/profile) để bấm \"Xác nhận đã nhận\" và tải bản PDF.",
                        "EVENT",
                        eventId,
                        "CERT_ISSUED:" + cert.getId()
                );
            }
            Map<String, Object> after = new LinkedHashMap<>();
            after.put("clubId", clubId);
            after.put("eventId", eventId);
            after.put("issuedCount", saved.size());
            after.put("totalCertificates", existingCerts.size() + saved.size());
            auditService.record(actor.id(), AuditAction.CERTIFICATE_ISSUED, eventId, clubId, null, after);
        }

        List<EventCertificateResponse> items = certificateRepository.findByEvent_IdOrderByIssuedAtDesc(eventId).stream()
                .map(EventCertificateServiceImpl::toResponse)
                .toList();
        return new IssueCertificatesResponse(eventId, newlyCreated.size(), items.size(), items);
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateListResponse listForEvent(Actor actor, UUID eventId) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        UUID clubId = event.getClub().getId();
        UUID deptId = event.getDepartment() == null ? null : event.getDepartment().getId();

        boolean allowed = authorizationService.hasPermission(actor, CertificateConstants.PERMISSION_VIEW, clubId, deptId)
                || authorizationService.hasPermission(actor, CertificateConstants.PERMISSION_ISSUE, clubId, deptId)
                || authorizationService.hasPermission(actor, CertificateConstants.PERMISSION_TEMPLATE, clubId, deptId)
                || authorizationService.hasPermission(actor, CertificateConstants.PERMISSION_REVOKE, clubId, deptId)
                || authorizationService.hasPermission(actor, EventConstants.PERMISSION_VIEW, clubId, deptId);
        if (!allowed) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }

        List<EventCertificateResponse> items = certificateRepository.findByEvent_IdOrderByIssuedAtDesc(eventId).stream()
                .map(EventCertificateServiceImpl::toResponse)
                .toList();
        return new CertificateListResponse(items, items.size());
    }

    @Override
    @Transactional
    public EventCertificateResponse revoke(Actor actor, UUID certificateId, RevokeCertificateRequest request) {
        EventCertificate cert = certificateRepository.findWithRelationsById(certificateId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CERTIFICATE_NOT_FOUND", "Certificate not found"));

        UUID clubId = cert.getClub().getId();
        UUID deptId = cert.getEvent().getDepartment() == null ? null : cert.getEvent().getDepartment().getId();
        requireCertificatePermission(actor, clubId, deptId, CertificateConstants.PERMISSION_REVOKE);
        if (cert.getStatus() == CertificateStatus.REVOKED) {
            throw new ApiException(HttpStatus.CONFLICT, "CERTIFICATE_ALREADY_REVOKED",
                    "Chứng nhận này đã bị thu hồi trước đó");
        }

        String reason = request.reason().strip();
        OffsetDateTime now = OffsetDateTime.now(clock);
        cert.setStatus(CertificateStatus.REVOKED);
        cert.setRevokedBy(actor.id());
        cert.setRevokedAt(now);
        cert.setRevocationReason(reason);
        EventCertificate saved = certificateRepository.saveAndFlush(cert);

        notificationService.create(
                saved.getUser().getId(),
                "Thu hồi chứng nhận: " + saved.getEventTitle(),
                "Chứng nhận điện tử mã " + saved.getCertificateCode() + " đã bị thu hồi. Lý do: " + reason,
                "EVENT",
                saved.getEvent().getId(),
                "CERT_REVOKED:" + saved.getId()
        );

        Map<String, Object> before = Map.of("status", CertificateStatus.ISSUED.name());
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("certificateId", saved.getId());
        after.put("certificateCode", saved.getCertificateCode());
        after.put("eventId", saved.getEvent().getId());
        after.put("userId", saved.getUser().getId());
        after.put("status", CertificateStatus.REVOKED.name());
        after.put("revocationReason", reason);
        auditService.record(actor.id(), AuditAction.CERTIFICATE_REVOKED, saved.getId(), clubId, before, after);

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateListResponse listMine(Actor actor) {
        List<EventCertificateResponse> items = certificateRepository.findByUser_IdOrderByIssuedAtDesc(actor.id()).stream()
                .map(EventCertificateServiceImpl::toResponse)
                .toList();
        return new CertificateListResponse(items, items.size());
    }

    @Override
    @Transactional(readOnly = true)
    public PublicCertificateVerificationResponse verifyPublic(String certificateCode) {
        if (certificateCode == null || certificateCode.isBlank()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CERTIFICATE_NOT_FOUND", "Certificate not found");
        }
        String normalized = certificateCode.strip().toUpperCase(Locale.ROOT);
        EventCertificate cert = certificateRepository.findByCertificateCode(normalized)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CERTIFICATE_NOT_FOUND", "Certificate not found"));

        return new PublicCertificateVerificationResponse(
                cert.getCertificateCode(),
                cert.getStatus().name(),
                cert.getStatus() == CertificateStatus.ISSUED,
                cert.getRecipientName(),
                cert.getStudentCode(),
                cert.getClubCode(),
                cert.getClubName(),
                cert.getEventTitle(),
                cert.getEventStartTime(),
                cert.getAcademicTerm(),
                cert.getParticipantType().name(),
                cert.getEventRole(),
                cert.getIssuedAt(),
                cert.getRevokedAt(),
                cert.getRevocationReason(),
                cert.getVerificationSha256(),
                cert.getTemplateImageUrl(),
                cert.getAcknowledgedAt()
        );
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = CacheConfig.CACHE_PUBLIC_EVENTS, allEntries = true)
    public CertificateTemplateResponse uploadTemplate(Actor actor, UUID eventId, UploadedFile file) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        UUID clubId = event.getClub().getId();
        UUID deptId = event.getDepartment() == null ? null : event.getDepartment().getId();
        requireCertificatePermission(actor, clubId, deptId, CertificateConstants.PERMISSION_TEMPLATE);

        ImageUploads.ValidatedImage image = ImageUploads.read(file, TEMPLATE_MAX_BYTES);
        String fileName = eventId + "-" + UUID.randomUUID().toString().replace("-", "") + image.extension();
        String key = TEMPLATE_KEY_PREFIX + fileName;
        String previousUrl = event.getCertificateTemplateUrl();
        String url = publicApiBaseUrl + ApiPaths.publicCertificateTemplatePath(fileName);

        documentStorage.put(key, new ByteArrayInputStream(image.bytes()), image.bytes().length, image.contentType());
        try {
            event.setCertificateTemplateUrl(url);
            eventRepository.saveAndFlush(event);
            syncTemplateOnIssuedCertificates(eventId, url);
        } catch (RuntimeException failed) {
            deleteQuietly(key);
            throw failed;
        }

        deletePreviousTemplateQuietly(eventId, previousUrl);

        Map<String, Object> before = previousUrl == null ? null : Map.of("certificateTemplateUrl", previousUrl);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("eventId", eventId);
        after.put("clubId", clubId);
        after.put("certificateTemplateUrl", url);
        auditService.record(actor.id(), AuditAction.CERTIFICATE_TEMPLATE_UPDATED, eventId, clubId, before, after);

        return new CertificateTemplateResponse(eventId, url);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = CacheConfig.CACHE_PUBLIC_EVENTS, allEntries = true)
    public CertificateTemplateResponse deleteTemplate(Actor actor, UUID eventId) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        UUID clubId = event.getClub().getId();
        UUID deptId = event.getDepartment() == null ? null : event.getDepartment().getId();
        requireCertificatePermission(actor, clubId, deptId, CertificateConstants.PERMISSION_TEMPLATE);

        String previousUrl = event.getCertificateTemplateUrl();
        event.setCertificateTemplateUrl(null);
        eventRepository.saveAndFlush(event);
        syncTemplateOnIssuedCertificates(eventId, null);
        deletePreviousTemplateQuietly(eventId, previousUrl);

        Map<String, Object> before = previousUrl == null ? null : Map.of("certificateTemplateUrl", previousUrl);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("eventId", eventId);
        after.put("clubId", clubId);
        after.put("certificateTemplateUrl", null);
        auditService.record(actor.id(), AuditAction.CERTIFICATE_TEMPLATE_UPDATED, eventId, clubId, before, after);

        return new CertificateTemplateResponse(eventId, null);
    }

    @Override
    public ClubMediaContent openTemplate(String fileName) {
        if (fileName == null || !TEMPLATE_FILE_NAME.matcher(fileName).matches()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CERTIFICATE_TEMPLATE_NOT_FOUND",
                    "Certificate template not found");
        }
        DocumentStorage.StoredObject stored;
        try {
            stored = documentStorage.open(TEMPLATE_KEY_PREFIX + fileName);
        } catch (RuntimeException missing) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CERTIFICATE_TEMPLATE_NOT_FOUND",
                    "Certificate template not found");
        }
        String ext = fileName.substring(fileName.lastIndexOf('.') + 1);
        String contentType = "jpg".equals(ext) ? "image/jpeg" : "image/" + ext;
        return new ClubMediaContent(fileName, contentType, stored.size(), stored.content());
    }

    @Override
    @Transactional
    public EventCertificateResponse acknowledgeMine(Actor actor, UUID certificateId) {
        EventCertificate cert = certificateRepository.findWithRelationsById(certificateId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CERTIFICATE_NOT_FOUND", "Certificate not found"));
        if (!cert.getUser().getId().equals(actor.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        if (cert.getStatus() == CertificateStatus.REVOKED) {
            throw new ApiException(HttpStatus.CONFLICT, "CERTIFICATE_REVOKED",
                    "Chứng nhận đã bị thu hồi, không thể xác nhận.");
        }
        if (cert.getAcknowledgedAt() == null) {
            OffsetDateTime now = OffsetDateTime.now(clock);
            cert.setAcknowledgedAt(now);
            cert = certificateRepository.saveAndFlush(cert);

            Map<String, Object> after = new LinkedHashMap<>();
            after.put("certificateId", cert.getId());
            after.put("certificateCode", cert.getCertificateCode());
            after.put("eventId", cert.getEvent().getId());
            after.put("userId", cert.getUser().getId());
            after.put("acknowledgedAt", now.toString());
            auditService.record(actor.id(), AuditAction.CERTIFICATE_ACKNOWLEDGED, cert.getId(),
                    cert.getClub().getId(), null, after);
        }
        return toResponse(cert);
    }

    @Override
    @Transactional
    public RemindCertificatesResponse remindForEvent(Actor actor, UUID eventId, RemindCertificatesRequest request) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        UUID clubId = event.getClub().getId();
        UUID deptId = event.getDepartment() == null ? null : event.getDepartment().getId();
        requireCertificatePermission(actor, clubId, deptId, CertificateConstants.PERMISSION_ISSUE);

        Set<UUID> filterIds = (request != null && request.certificateIds() != null && !request.certificateIds().isEmpty())
                ? new HashSet<>(request.certificateIds()) : null;
        String customMessage = (request == null || request.customMessage() == null || request.customMessage().isBlank())
                ? null : request.customMessage().strip();

        List<EventCertificate> allForEvent = certificateRepository.findByEvent_IdOrderByIssuedAtDesc(eventId);
        List<EventCertificate> targets = allForEvent.stream()
                .filter(c -> c.getStatus() == CertificateStatus.ISSUED && c.getAcknowledgedAt() == null)
                .filter(c -> filterIds == null || filterIds.contains(c.getId()))
                .toList();

        boolean smtpConfigured = otpMailService.isMailConfigured();
        OffsetDateTime now = OffsetDateTime.now(clock);
        int emailedCount = 0;

        for (EventCertificate cert : targets) {
            cert.setReminderCount(cert.getReminderCount() + 1);
            cert.setRemindedAt(now);
            User recipient = cert.getUser();
            String basePrompt = "Bạn có giấy chứng nhận điện tử mã " + cert.getCertificateCode()
                    + " của sự kiện \"" + event.getTitle()
                    + "\" chưa xác nhận. Vui lòng mở Hồ sơ cá nhân (/profile) và bấm \"Xác nhận đã nhận chứng nhận\".";
            String body = customMessage == null ? basePrompt : customMessage + " — " + basePrompt;

            notificationService.create(
                    recipient.getId(),
                    "Nhắc xác nhận chứng nhận: " + event.getTitle(),
                    body,
                    "EVENT",
                    eventId,
                    "CERT_REMIND:" + cert.getId() + ":" + cert.getReminderCount()
            );

            String email = recipient.getEmail();
            if (smtpConfigured
                    && recipient.isEmailNotificationsEnabled()
                    && email != null && !email.isBlank()
                    && !email.endsWith(".local") && !email.endsWith(".test")) {
                emailedCount++;
            }
        }

        if (!targets.isEmpty()) {
            certificateRepository.saveAllAndFlush(targets);
            Map<String, Object> after = new LinkedHashMap<>();
            after.put("eventId", eventId);
            after.put("clubId", clubId);
            after.put("remindedCount", targets.size());
            after.put("emailedCount", emailedCount);
            after.put("smtpConfigured", smtpConfigured);
            auditService.record(actor.id(), AuditAction.CERTIFICATE_REMINDER_SENT, eventId, clubId, null, after);
        }

        List<EventCertificateResponse> refreshed = certificateRepository.findByEvent_IdOrderByIssuedAtDesc(eventId).stream()
                .map(EventCertificateServiceImpl::toResponse)
                .toList();
        return new RemindCertificatesResponse(eventId, targets.size(), emailedCount, smtpConfigured, refreshed);
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateManagementResponse listManagement(Actor actor, UUID clubId, String academicTerm,
                                                        String status, Boolean acknowledged, String search,
                                                        int offset, int limit) {
        boolean hasGlobal = authorizationService.hasGlobalPermission(actor, CertificateConstants.PERMISSION_VIEW)
                || authorizationService.hasGlobalPermission(actor, CertificateConstants.PERMISSION_ISSUE)
                || authorizationService.hasGlobalPermission(actor, CertificateConstants.PERMISSION_REVOKE)
                || authorizationService.hasGlobalPermission(actor, ClubConstants.PERMISSION_VIEW)
                || authorizationService.hasGlobalPermission(actor, EventConstants.PERMISSION_VIEW);

        if (clubId != null) {
            boolean allowed = hasGlobal
                    || authorizationService.hasPermission(actor, CertificateConstants.PERMISSION_VIEW, clubId, null)
                    || authorizationService.hasPermission(actor, CertificateConstants.PERMISSION_ISSUE, clubId, null)
                    || authorizationService.hasPermission(actor, CertificateConstants.PERMISSION_TEMPLATE, clubId, null)
                    || authorizationService.hasPermission(actor, CertificateConstants.PERMISSION_REVOKE, clubId, null)
                    || authorizationService.hasPermission(actor, EventConstants.PERMISSION_VIEW, clubId, null)
                    || authorizationService.hasPermission(actor, ClubConstants.PERMISSION_VIEW, clubId, null);
            if (!allowed) {
                throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
            }
        } else if (!hasGlobal) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }

        List<EventCertificate> base = clubId != null
                ? certificateRepository.findByClub_IdOrderByIssuedAtDesc(clubId)
                : certificateRepository.findAllByOrderByIssuedAtDesc();

        String termFilter = (academicTerm == null || academicTerm.isBlank()) ? null : academicTerm.strip();
        if (termFilter != null) {
            base = base.stream()
                    .filter(c -> c.getAcademicTerm() != null && c.getAcademicTerm().strip().equalsIgnoreCase(termFilter))
                    .toList();
        }

        CertificateStatsSummary summary = computeStatsSummary(base);

        String statusFilter = (status == null || status.isBlank()) ? null : status.strip().toUpperCase(Locale.ROOT);
        String searchFilter = (search == null || search.isBlank()) ? null : search.strip().toLowerCase(Locale.ROOT);

        List<EventCertificate> filtered = base.stream()
                .filter(c -> statusFilter == null || c.getStatus().name().equals(statusFilter))
                .filter(c -> acknowledged == null || (acknowledged ? c.getAcknowledgedAt() != null : c.getAcknowledgedAt() == null))
                .filter(c -> searchFilter == null || matchesSearch(c, searchFilter))
                .toList();

        long total = filtered.size();
        int safeOffset = Math.max(0, offset);
        int clampedLimit = Math.max(1, Math.min(200, limit));
        int fromIdx = Math.min(safeOffset, filtered.size());
        int toIdx = Math.min(fromIdx + clampedLimit, filtered.size());

        List<EventCertificateResponse> pageItems = filtered.subList(fromIdx, toIdx).stream()
                .map(EventCertificateServiceImpl::toResponse)
                .toList();
        return new CertificateManagementResponse(summary, pageItems, total);
    }

    private void requireCertificatePermission(Actor actor, UUID clubId, UUID deptId, String permissionKey) {
        if (!authorizationService.hasPermission(actor, permissionKey, clubId, deptId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
    }

    private void syncTemplateOnIssuedCertificates(UUID eventId, String templateUrl) {
        List<EventCertificate> issued = certificateRepository.findByEvent_IdOrderByIssuedAtDesc(eventId).stream()
                .filter(c -> c.getStatus() == CertificateStatus.ISSUED)
                .toList();
        if (issued.isEmpty()) {
            return;
        }
        for (EventCertificate cert : issued) {
            cert.setTemplateImageUrl(templateUrl);
        }
        certificateRepository.saveAllAndFlush(issued);
    }

    private void deletePreviousTemplateQuietly(UUID eventId, String previousUrl) {
        String previousFile = ownTemplateFileName(previousUrl);
        if (previousFile != null && previousFile.startsWith(eventId.toString())) {
            deleteQuietly(TEMPLATE_KEY_PREFIX + previousFile);
        }
    }

    private String ownTemplateFileName(String url) {
        String prefix = publicApiBaseUrl + ApiPaths.publicCertificateTemplatePath("");
        if (url == null || !url.startsWith(prefix)) {
            return null;
        }
        String name = url.substring(prefix.length());
        return TEMPLATE_FILE_NAME.matcher(name).matches() ? name : null;
    }

    private void deleteQuietly(String key) {
        try {
            documentStorage.delete(key);
        } catch (RuntimeException ignored) {
            // orphaned template object only costs storage; never fail the request for it
        }
    }

    private static CertificateStatsSummary computeStatsSummary(List<EventCertificate> certificates) {
        long totalCertificates = certificates.size();
        long issuedCount = 0;
        long revokedCount = 0;
        long acknowledgedCount = 0;
        long pendingAcknowledgeCount = 0;

        Map<UUID, ClubStatsAccumulator> byClub = new LinkedHashMap<>();
        for (EventCertificate cert : certificates) {
            UUID cid = cert.getClub().getId();
            ClubStatsAccumulator acc = byClub.computeIfAbsent(cid,
                    id -> new ClubStatsAccumulator(id, cert.getClubCode(), cert.getClubName()));
            if (cert.getStatus() == CertificateStatus.ISSUED) {
                issuedCount++;
                acc.issuedCount++;
                if (cert.getAcknowledgedAt() != null) {
                    acknowledgedCount++;
                    acc.acknowledgedCount++;
                } else {
                    pendingAcknowledgeCount++;
                    acc.pendingAcknowledgeCount++;
                }
            } else if (cert.getStatus() == CertificateStatus.REVOKED) {
                revokedCount++;
                acc.revokedCount++;
            }
        }

        int rate = calcRate(acknowledgedCount, issuedCount);
        List<ClubCertificateBreakdownItem> breakdown = byClub.values().stream()
                .map(acc -> new ClubCertificateBreakdownItem(
                        acc.clubId,
                        acc.clubCode,
                        acc.clubName,
                        acc.issuedCount,
                        acc.acknowledgedCount,
                        acc.pendingAcknowledgeCount,
                        acc.revokedCount,
                        calcRate(acc.acknowledgedCount, acc.issuedCount)
                ))
                .sorted(Comparator.comparingLong(ClubCertificateBreakdownItem::issuedCount).reversed()
                        .thenComparing(ClubCertificateBreakdownItem::clubCode, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();

        return new CertificateStatsSummary(
                totalCertificates,
                issuedCount,
                revokedCount,
                acknowledgedCount,
                pendingAcknowledgeCount,
                rate,
                breakdown
        );
    }

    private static int calcRate(long acknowledged, long issued) {
        if (issued <= 0 || acknowledged <= 0) {
            return 0;
        }
        return (int) Math.round(acknowledged * 100.0 / issued);
    }

    private static boolean matchesSearch(EventCertificate c, String q) {
        return containsIgnoreCase(c.getRecipientName(), q)
                || containsIgnoreCase(c.getStudentCode(), q)
                || containsIgnoreCase(c.getCertificateCode(), q)
                || containsIgnoreCase(c.getEventTitle(), q)
                || containsIgnoreCase(c.getClubCode(), q)
                || containsIgnoreCase(c.getClubName(), q);
    }

    private static boolean containsIgnoreCase(String value, String lowerQuery) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(lowerQuery);
    }

    private static final class ClubStatsAccumulator {
        final UUID clubId;
        final String clubCode;
        final String clubName;
        long issuedCount;
        long acknowledgedCount;
        long pendingAcknowledgeCount;
        long revokedCount;

        ClubStatsAccumulator(UUID clubId, String clubCode, String clubName) {
            this.clubId = clubId;
            this.clubCode = clubCode;
            this.clubName = clubName;
        }
    }

    private String generateUniqueCode(UUID eventId, UUID userId, int year, String clubCode, Set<String> pendingCodes) {
        for (int attempt = 0; attempt < 16; attempt++) {
            String seed = attempt == 0
                    ? eventId + ":" + userId + ":" + CODE_SALT
                    : eventId + ":" + userId + ":" + CODE_SALT + ":" + attempt;
            byte[] hash = sha256(seed);
            StringBuilder suffix = new StringBuilder(6);
            for (int i = 0; i < 6; i++) {
                int idx = Byte.toUnsignedInt(hash[i]) % CODE_ALPHABET.length;
                suffix.append(CODE_ALPHABET[idx]);
            }
            String candidate = "VJU-" + year + "-" + clubCode + "-" + suffix;
            if (!pendingCodes.contains(candidate) && !certificateRepository.existsByCertificateCode(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Unable to generate unique certificate code");
    }

    private static String sanitizeClubCode(String rawCode) {
        if (rawCode == null) {
            return "CLB";
        }
        String cleaned = rawCode.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        if (cleaned.isEmpty()) {
            return "CLB";
        }
        return cleaned.length() > 16 ? cleaned.substring(0, 16) : cleaned;
    }

    static String computeVerificationSha256(String certificateCode, UUID eventId, UUID userId,
                                            String studentCode, EventParticipantType participantType,
                                            String attendanceLockSha256) {
        String canonical = certificateCode + "|"
                + eventId + "|"
                + userId + "|"
                + (studentCode == null ? "" : studentCode) + "|"
                + participantType.name() + "|"
                + (attendanceLockSha256 == null ? "" : attendanceLockSha256);
        return HexFormat.of().formatHex(sha256(canonical));
    }

    private static byte[] sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return digest.digest(input.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", ex);
        }
    }

    private static EventCertificateResponse toResponse(EventCertificate cert) {
        return new EventCertificateResponse(
                cert.getId(),
                cert.getCertificateCode(),
                cert.getEvent().getId(),
                cert.getClub().getId(),
                cert.getUser().getId(),
                cert.getParticipantType().name(),
                cert.getEventRole(),
                cert.getAcademicTerm(),
                cert.getRecipientName(),
                cert.getStudentCode(),
                cert.getClubCode(),
                cert.getClubName(),
                cert.getEventTitle(),
                cert.getEventStartTime(),
                cert.getStatus().name(),
                cert.getVerificationSha256(),
                cert.getIssuedBy(),
                cert.getIssuedAt(),
                cert.getRevokedBy(),
                cert.getRevokedAt(),
                cert.getRevocationReason(),
                cert.getTemplateImageUrl(),
                cert.getAcknowledgedAt(),
                cert.getRemindedAt(),
                cert.getReminderCount()
        );
    }
}
