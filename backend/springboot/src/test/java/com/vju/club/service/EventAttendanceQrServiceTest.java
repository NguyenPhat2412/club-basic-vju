package com.vju.club.service;

import com.vju.club.dto.request.QrAttendanceCheckInRequest;
import com.vju.club.dto.response.EventAttendanceQrTokenResponse;
import com.vju.club.dto.response.EventAttendanceResponse;
import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.Event;
import com.vju.club.entity.EventAttendance;
import com.vju.club.entity.EventRegistration;
import com.vju.club.entity.User;
import com.vju.club.enums.EventRegistrationStatus;
import com.vju.club.enums.EventStatus;
import com.vju.club.enums.EventType;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.EventMapper;
import com.vju.club.repository.EventAttendanceRepository;
import com.vju.club.repository.EventRegistrationRepository;
import com.vju.club.repository.EventRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.impl.EventAttendanceQrServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventAttendanceQrServiceTest {
    @Mock EventRepository eventRepository;
    @Mock EventRegistrationRepository registrationRepository;
    @Mock EventAttendanceRepository attendanceRepository;
    @Mock MembershipRepository membershipRepository;
    @Mock UserRepository userRepository;
    @Mock PermissionAuthorizationService authorizationService;
    @Mock SystemSettingsService systemSettingsService;
    @Mock AuditService auditService;
    @Mock EventMapper eventMapper;

    private final Instant fixedNow = Instant.parse("2026-11-18T03:00:00Z");
    private EventAttendanceQrServiceImpl service;
    private UUID clubId;
    private UUID eventId;
    private UUID organizerId;
    private UUID studentId;
    private Event activeEvent;
    private User organizer;
    private User student;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(fixedNow, ZoneOffset.UTC);
        service = new EventAttendanceQrServiceImpl(
                eventRepository,
                registrationRepository,
                attendanceRepository,
                membershipRepository,
                userRepository,
                authorizationService,
                systemSettingsService,
                auditService,
                eventMapper,
                clock,
                "test-qr-hmac-secret-key-with-32-chars!!");

        clubId = UUID.randomUUID();
        eventId = UUID.randomUUID();
        organizerId = UUID.randomUUID();
        studentId = UUID.randomUUID();

        Club club = new Club();
        club.setId(clubId);
        club.setCode("VJUA");
        club.setName("CLB Công nghệ");

        activeEvent = new Event();
        activeEvent.setId(eventId);
        activeEvent.setClub(club);
        activeEvent.setTitle("Ngày hội Tân Sinh Viên VJU");
        activeEvent.setEventType(EventType.WORKSHOP);
        activeEvent.setStatus(EventStatus.OPEN_REGISTRATION);
        activeEvent.setStartTime(OffsetDateTime.ofInstant(fixedNow.plusSeconds(1800), ZoneOffset.UTC));
        activeEvent.setEndTime(OffsetDateTime.ofInstant(fixedNow.plusSeconds(7200), ZoneOffset.UTC));

        organizer = new User();
        organizer.setId(organizerId);
        organizer.setEmail("bcn@st.vju.ac.vn");
        organizer.setFullName("Ban Chủ Nhiệm");

        student = new User();
        student.setId(studentId);
        student.setEmail("sv@st.vju.ac.vn");
        student.setFullName("Sinh Viên A");

        SystemSettingsResponse mockSettings = Mockito.mock(SystemSettingsResponse.class);
        lenient().when(mockSettings.attendanceOpensBeforeMinutes()).thenReturn(120);
        lenient().when(mockSettings.attendanceEditWindowHours()).thenReturn(48);
        lenient().when(systemSettingsService.current()).thenReturn(mockSettings);
    }

    @Test
    void issuesSignedTokenAndRecordsIdempotentStudentCheckIn() {
        when(eventRepository.findWithRelationsById(eventId)).thenReturn(Optional.of(activeEvent));
        when(authorizationService.hasPermission(any(), eq("event.attendance"), eq(clubId), any())).thenReturn(true);

        EventAttendanceQrTokenResponse issued = service.issueQrToken(new Actor(organizerId), eventId);
        assertThat(issued.eventId()).isEqualTo(eventId);
        assertThat(issued.token()).startsWith("v1." + eventId + ".");
        assertThat(issued.ttlSeconds()).isEqualTo(1800);

        when(userRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(userRepository.findById(organizerId)).thenReturn(Optional.of(organizer));
        when(registrationRepository.findByEvent_IdAndUser_IdAndStatus(eventId, studentId, EventRegistrationStatus.REGISTERED))
                .thenReturn(Optional.of(new EventRegistration()));
        when(attendanceRepository.findByEvent_IdAndUser_Id(eventId, studentId)).thenReturn(Optional.empty());
        when(attendanceRepository.saveAndFlush(any(EventAttendance.class))).thenAnswer(inv -> {
            EventAttendance a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });
        when(eventMapper.toAttendanceResponse(any(EventAttendance.class))).thenAnswer(inv -> {
            EventAttendance a = inv.getArgument(0);
            return new EventAttendanceResponse(
                    a.getId(), eventId, studentId, student.getEmail(), student.getFullName(),
                    "24010001", a.getStatus().name(), a.getNote(), a.getEditReason(),
                    organizerId, a.getCheckedAt(), 0L);
        });

        EventAttendanceResponse checkedIn = service.checkInWithQr(
                new Actor(studentId),
                eventId,
                new QrAttendanceCheckInRequest(issued.token()));
        assertThat(checkedIn.status()).isEqualTo("PRESENT");
        assertThat(checkedIn.note()).contains("QR");
    }

    @Test
    void rejectsTamperedWrongEventExpiredAndUnregisteredCheckIn() {
        when(eventRepository.findWithRelationsById(eventId)).thenReturn(Optional.of(activeEvent));
        when(authorizationService.hasPermission(any(), eq("event.attendance"), eq(clubId), any())).thenReturn(true);

        EventAttendanceQrTokenResponse issued = service.issueQrToken(new Actor(organizerId), eventId);

        assertThatThrownBy(() -> service.checkInWithQr(
                new Actor(studentId),
                eventId,
                new QrAttendanceCheckInRequest(issued.token() + "tampered")))
                .isInstanceOf(ApiException.class)
                .extracting("code")
                .isEqualTo("QR_TOKEN_INVALID");

        assertThatThrownBy(() -> service.checkInWithQr(
                new Actor(studentId),
                UUID.randomUUID(),
                new QrAttendanceCheckInRequest(issued.token())))
                .isInstanceOf(ApiException.class)
                .extracting("code")
                .isEqualTo("QR_TOKEN_INVALID");

        when(userRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(registrationRepository.findByEvent_IdAndUser_IdAndStatus(eventId, studentId, EventRegistrationStatus.REGISTERED))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.checkInWithQr(
                new Actor(studentId),
                eventId,
                new QrAttendanceCheckInRequest(issued.token())))
                .isInstanceOf(ApiException.class)
                .extracting("code")
                .isEqualTo("PARTICIPANT_NOT_REGISTERED");

        Clock expiredClock = Clock.fixed(fixedNow.plusSeconds(3600), ZoneOffset.UTC);
        EventAttendanceQrServiceImpl laterService = new EventAttendanceQrServiceImpl(
                eventRepository, registrationRepository, attendanceRepository, membershipRepository,
                userRepository, authorizationService, systemSettingsService, auditService,
                eventMapper, expiredClock, "test-qr-hmac-secret-key-with-32-chars!!");

        assertThatThrownBy(() -> laterService.checkInWithQr(
                new Actor(studentId),
                eventId,
                new QrAttendanceCheckInRequest(issued.token())))
                .isInstanceOf(ApiException.class)
                .extracting("code")
                .isEqualTo("QR_TOKEN_EXPIRED");
    }
}
