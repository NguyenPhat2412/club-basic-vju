package com.vju.club.controller;

import com.vju.club.annotation.PublicEndpoint;
import com.vju.club.common.ApiPaths;
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
import com.vju.club.enums.EventParticipantType;
import com.vju.club.enums.EventRegistrationStatus;
import com.vju.club.enums.EventStatus;
import com.vju.club.security.Actor;
import com.vju.club.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
@Tag(name = "Events & Calendar", description = "Quản lý sự kiện, lịch sinh hoạt, đăng ký tham gia, điểm danh và lịch tổng hợp cá nhân (TC05–TC07)")
public class EventController {
    private final EventService eventService;

    @PublicEndpoint(reason = "Public events discovery on landing page")
    @GetMapping(ApiPaths.PUBLIC_EVENTS)
    @Operation(summary = "Danh sách sự kiện công khai trên Landing Page")
    public PageResponse<EventResponse> listPublic(
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return eventService.listPublic(offset, limit);
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

    @GetMapping(ApiPaths.MY_CALENDAR)
    @Operation(summary = "Lịch tổng hợp cá nhân (Sự kiện CLB + Deadline Task)")
    public List<CalendarItemResponse> getMyCalendar(
            Actor actor,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to) {
        return eventService.getMyCalendar(actor, from, to);
    }
}
