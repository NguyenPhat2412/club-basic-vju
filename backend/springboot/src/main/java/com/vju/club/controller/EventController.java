package com.vju.club.controller;

import com.vju.club.annotation.PublicEndpoint;
import com.vju.club.common.ApiPaths;
import com.vju.club.dto.record.ClubMediaContent;
import com.vju.club.dto.record.UploadedFile;
import com.vju.club.dto.request.CreateEventFeedbackRequest;
import com.vju.club.dto.request.CreateEventRequest;
import com.vju.club.dto.request.EventRegistrationRequest;
import com.vju.club.dto.request.LockEventAttendanceRequest;
import com.vju.club.dto.request.QrAttendanceCheckInRequest;
import com.vju.club.dto.request.RecordAttendanceRequest;
import com.vju.club.dto.request.UpdateEventRegistrationRequest;
import com.vju.club.dto.request.UpdateEventRequest;
import com.vju.club.dto.response.CalendarItemResponse;
import com.vju.club.dto.response.EventAttendanceQrTokenResponse;
import com.vju.club.dto.response.EventAttendanceResponse;
import com.vju.club.dto.response.EventFeedbackResponse;
import com.vju.club.dto.response.EventFeedbackSummaryResponse;
import com.vju.club.dto.response.EventRegistrationResponse;
import com.vju.club.dto.response.EventResponse;
import com.vju.club.dto.response.MyEventParticipationResponse;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.enums.EventParticipantType;
import com.vju.club.enums.EventRegistrationStatus;
import com.vju.club.enums.EventStatus;
import com.vju.club.security.Actor;
import com.vju.club.service.EventAttendanceQrService;
import com.vju.club.service.EventService;
import com.vju.club.service.impl.EventAttendanceLockServiceImpl;
import com.vju.club.service.impl.EventFeedbackServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
@Tag(name = "Events & Calendar", description = "Quản lý sự kiện, lịch sinh hoạt, đăng ký tham gia, điểm danh và lịch tổng hợp cá nhân (TC05–TC07)")
public class EventController {
    private final EventService eventService;
    private final EventAttendanceQrService eventAttendanceQrService;
    private final EventAttendanceLockServiceImpl eventAttendanceLockService;
    private final EventFeedbackServiceImpl eventFeedbackService;

    @PublicEndpoint(reason = "Public events discovery on landing page")
    @GetMapping(ApiPaths.PUBLIC_EVENTS)
    @Operation(summary = "Danh sách sự kiện công khai trên Landing Page")
    public PageResponse<EventResponse> listPublic(
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return eventService.listPublic(offset, limit);
    }

    @PublicEndpoint(reason = "Public festival booths listing under a parent umbrella event")
    @GetMapping(ApiPaths.PUBLIC_EVENT_BOOTHS)
    @Operation(summary = "Danh sách gian hàng / hoạt động CLB con thuộc một sự kiện lễ hội lớn")
    public List<EventResponse> listPublicBooths(@PathVariable UUID eventId) {
        return eventService.listPublicBooths(eventId);
    }

    @GetMapping(ApiPaths.EVENTS_DISCOVER)
    @Operation(summary = "Danh sách sự kiện khám phá cho người dùng đã đăng nhập (PB-88 AC01)",
            description = "Trả về sự kiện công khai (allowCtv=true) và sự kiện nội bộ chỉ thuộc các CLB mà người dùng là thành viên ACTIVE.")
    public PageResponse<EventResponse> listDiscover(
            Actor actor,
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return eventService.listDiscover(actor, offset, limit);
    }

    @PostMapping(ApiPaths.CLUB_EVENTS)
    @Operation(summary = "Tạo sự kiện hoặc lịch sinh hoạt CLB (TC05)",
            description = "Quyền: event.create tại CLB. Kiểm tra startTime < endTime và registrationDeadline <= startTime.")
    public ResponseEntity<EventResponse> create(Actor actor,
                                                @PathVariable UUID clubId,
                                                @Valid @RequestBody CreateEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventService.create(actor, clubId, request));
    }

    @GetMapping(ApiPaths.CLUB_EVENTS)
    @Operation(summary = "Danh sách sự kiện của CLB")
    public PageResponse<EventResponse> listForClub(Actor actor,
                                                   @PathVariable UUID clubId,
                                                   @RequestParam(required = false) EventStatus status,
                                                   @RequestParam(required = false) UUID departmentId,
                                                   @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                   @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return eventService.listForClub(actor, clubId, status, departmentId, offset, limit);
    }

    @GetMapping(ApiPaths.EVENT_BY_ID)
    @Operation(summary = "Chi tiết sự kiện")
    public EventResponse get(Actor actor, @PathVariable UUID eventId) {
        return eventService.get(actor, eventId);
    }

    @PatchMapping(ApiPaths.CLUB_EVENT_BY_ID)
    @Operation(summary = "Cập nhật thông tin hoặc trạng thái sự kiện")
    public EventResponse update(Actor actor,
                                @PathVariable UUID clubId,
                                @PathVariable UUID eventId,
                                @Valid @RequestBody UpdateEventRequest request) {
        return eventService.update(actor, clubId, eventId, request);
    }

    @PostMapping(value = ApiPaths.EVENT_COVER, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tải lên ảnh bìa / poster cho sự kiện (PNG/JPG/GIF/WEBP)")
    public EventResponse uploadCover(Actor actor,
                                     @PathVariable UUID eventId,
                                     @RequestPart("file") MultipartFile file) {
        return eventService.uploadCover(actor, eventId,
                new UploadedFile(file.getOriginalFilename(), file::getInputStream));
    }

    @DeleteMapping(ApiPaths.EVENT_COVER)
    @Operation(summary = "Xoá ảnh bìa / poster của sự kiện")
    public EventResponse deleteCover(Actor actor, @PathVariable UUID eventId) {
        return eventService.deleteCover(actor, eventId);
    }

    @PublicEndpoint(reason = "Public event poster/cover images; file names are unguessable")
    @GetMapping(ApiPaths.PUBLIC_EVENT_COVER)
    @Operation(summary = "Tải công khai ảnh bìa / poster sự kiện")
    public ResponseEntity<InputStreamResource> openCover(@PathVariable @Size(max = 128) String fileName) {
        ClubMediaContent media = eventService.openCover(fileName);
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(media.contentType()))
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable")
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; img-src 'self' data: blob:; style-src 'unsafe-inline'");
        if (media.sizeBytes() != null && media.sizeBytes() > 0) {
            builder.contentLength(media.sizeBytes());
        }
        return builder.body(new InputStreamResource(media.content()));
    }

    @PostMapping(ApiPaths.EVENT_REGISTRATIONS)
    @Operation(summary = "Đăng ký tham gia sự kiện (TC06)",
            description = "Hỗ trợ thành viên CLB và CTV (khi allowCtv=true). Chặn vượt maxParticipants (409 EVENT_FULL) và trùng đăng ký.")
    public ResponseEntity<EventRegistrationResponse> register(Actor actor,
                                                              @PathVariable UUID eventId,
                                                              @Valid @RequestBody(required = false) EventRegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventService.register(actor, eventId, request));
    }

    @PatchMapping(ApiPaths.EVENT_REGISTRATION_CANCEL_ME)
    @Operation(summary = "Hủy đăng ký tham gia sự kiện của tôi")
    public EventRegistrationResponse cancelRegistration(Actor actor, @PathVariable UUID eventId) {
        return eventService.cancelRegistration(actor, eventId);
    }

    @PostMapping(value = ApiPaths.EVENT_REGISTRATION_MY_SUBMISSION, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Nộp tệp hồ sơ tham gia sự kiện của tôi (PB-88 AC03)",
            description = "Yêu cầu đã đăng ký sự kiện và chưa quá registrationDeadline (tự khoá 409 REGISTRATION_CLOSED khi hết hạn).")
    public EventRegistrationResponse uploadMySubmission(
            Actor actor,
            @PathVariable UUID eventId,
            @RequestPart("file") MultipartFile file) {
        UploadedFile uploaded = new UploadedFile(file.getOriginalFilename(), file::getInputStream);
        return eventService.uploadMySubmission(actor, eventId, uploaded);
    }

    @GetMapping(ApiPaths.EVENT_REGISTRATION_SUBMISSION_DOWNLOAD)
    @Operation(summary = "Tải xuống tệp hồ sơ đã nộp của đăng ký sự kiện (PB-88 AC03)")
    public ResponseEntity<InputStreamResource> downloadSubmission(
            Actor actor,
            @PathVariable UUID eventId,
            @PathVariable UUID registrationId) {
        EventService.EventSubmissionDownload download = eventService.downloadSubmission(actor, eventId, registrationId);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(download.fileName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(download.contentType()))
                .contentLength(download.size())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(new InputStreamResource(download.content()));
    }

    @PatchMapping(ApiPaths.EVENT_REGISTRATION_BY_ID)
    @Operation(summary = "Cập nhật vai trò sự kiện và trạng thái tham gia nhân sự (PB-25.2)",
            description = "Quyền: event.update tại CLB/Ban. Vai trò trong sự kiện không tự biến CTV thành thành viên CLB.")
    public EventRegistrationResponse updateRegistration(Actor actor,
                                                        @PathVariable UUID eventId,
                                                        @PathVariable UUID registrationId,
                                                        @Valid @RequestBody UpdateEventRegistrationRequest request) {
        return eventService.updateRegistration(actor, eventId, registrationId, request);
    }

    @GetMapping(ApiPaths.MY_EVENT_REGISTRATIONS)
    @Operation(summary = "Danh sách sự kiện đã đăng ký, vai trò và kết quả điểm danh của tôi (PB-24.2, PB-32, PB-35.2)")
    public PageResponse<MyEventParticipationResponse> listMyRegistrations(
            Actor actor,
            @RequestParam(required = false) EventRegistrationStatus status,
            @RequestParam(required = false) EventParticipantType participantType,
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return eventService.listMyRegistrations(actor, status, participantType, offset, limit);
    }

    @GetMapping(ApiPaths.EVENT_REGISTRATIONS)
    @Operation(summary = "Danh sách người đã đăng ký sự kiện")
    public PageResponse<EventRegistrationResponse> listRegistrations(Actor actor,
                                                                     @PathVariable UUID eventId,
                                                                     @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                                     @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return eventService.listRegistrations(actor, eventId, offset, limit);
    }

    @PutMapping(ApiPaths.EVENT_ATTENDANCES)
    @Operation(summary = "Điểm danh sự kiện hàng loạt hoặc điều chỉnh có lý do (TC07, PB-31)",
            description = "Quyền: event.attendance (ghi nhận ban đầu) hoặc event.attendance_edit (sửa bản ghi / điều chỉnh sau COMPLETED trong cửa sổ cho phép).")
    public List<EventAttendanceResponse> recordAttendance(Actor actor,
                                                          @PathVariable UUID eventId,
                                                          @Valid @RequestBody RecordAttendanceRequest request) {
        return eventService.recordAttendance(actor, eventId, request);
    }

    @GetMapping(ApiPaths.EVENT_ATTENDANCES)
    @Operation(summary = "Xem danh sách điểm danh của sự kiện")
    public List<EventAttendanceResponse> listAttendances(Actor actor, @PathVariable UUID eventId) {
        return eventService.listAttendances(actor, eventId);
    }

    @PostMapping(ApiPaths.EVENT_ATTENDANCE_QR_TOKEN)
    @Operation(summary = "Tạo mã QR phiên điểm danh có thời hạn cho sự kiện")
    public ResponseEntity<EventAttendanceQrTokenResponse> issueAttendanceQrToken(
            Actor actor,
            @PathVariable UUID eventId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventAttendanceQrService.issueQrToken(actor, eventId));
    }

    @PostMapping(ApiPaths.EVENT_ATTENDANCE_QR_CHECK_IN)
    @Operation(summary = "Sinh viên / thành viên tự điểm danh sự kiện qua mã QR")
    public ResponseEntity<EventAttendanceResponse> checkInWithQr(
            Actor actor,
            @PathVariable UUID eventId,
            @Valid @RequestBody QrAttendanceCheckInRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventAttendanceQrService.checkInWithQr(actor, eventId, request));
    }

    @PostMapping(ApiPaths.EVENT_ATTENDANCES_LOCK)
    @Operation(summary = "Chốt & ký xác nhận điện tử SHA-256 bảng điểm danh sự kiện")
    public EventResponse lockAttendance(
            Actor actor,
            @PathVariable UUID eventId,
            @Valid @RequestBody(required = false) LockEventAttendanceRequest request) {
        return eventAttendanceLockService.lockAttendance(actor, eventId, request);
    }

    @PostMapping(ApiPaths.EVENT_FEEDBACKS)
    @Operation(summary = "Gửi đánh giá khảo sát sau sự kiện (chỉ mở cho người đã điểm danh Có mặt hoặc Đi muộn)")
    public ResponseEntity<EventFeedbackResponse> submitFeedback(
            Actor actor,
            @PathVariable UUID eventId,
            @Valid @RequestBody CreateEventFeedbackRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventFeedbackService.submitFeedback(actor, eventId, request));
    }

    @GetMapping(ApiPaths.EVENT_FEEDBACKS)
    @Operation(summary = "Xem tổng hợp và danh sách đánh giá sau sự kiện")
    public EventFeedbackSummaryResponse listFeedbacks(Actor actor, @PathVariable UUID eventId) {
        return eventFeedbackService.listFeedbacks(actor, eventId);
    }

    @GetMapping(ApiPaths.MY_CALENDAR)
    @Operation(summary = "Lịch tổng hợp cá nhân (Sự kiện CLB + Deadline Task)")
    public List<CalendarItemResponse> getMyCalendar(
            Actor actor,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to) {
        return eventService.getMyCalendar(actor, from, to);
    }
}
