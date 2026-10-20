package com.vju.club.modules.event.controller;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.auth.annotation.PublicEndpoint;
import com.vju.club.modules.event.dto.request.CreateEventRequest;
import com.vju.club.modules.event.dto.request.EventRegistrationRequest;
import com.vju.club.modules.event.dto.request.RecordAttendanceRequest;
import com.vju.club.modules.event.dto.request.UpdateEventRequest;
import com.vju.club.modules.event.dto.response.CalendarItemResponse;
import com.vju.club.modules.event.dto.response.EventAttendanceResponse;
import com.vju.club.modules.event.dto.response.EventRegistrationResponse;
import com.vju.club.modules.event.dto.response.EventResponse;
import com.vju.club.modules.event.enums.EventStatus;
import com.vju.club.modules.event.service.EventService;
import com.vju.club.security.Actor;
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
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Events & Calendar", description = "Quản lý sự kiện, lịch sinh hoạt, đăng ký tham gia, điểm danh và lịch tổng hợp cá nhân (TC05–TC07)")
public class EventController {
    private final EventService eventService;

    @PublicEndpoint(reason = "Public events discovery on landing page")
    @GetMapping("/public/events")
    @Operation(summary = "Danh sách sự kiện công khai trên Landing Page")
    public PageResponse<EventResponse> listPublic(
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return eventService.listPublic(offset, limit);
    }

    @PostMapping("/clubs/{clubId}/events")
    @Operation(summary = "Tạo sự kiện hoặc lịch sinh hoạt CLB (TC05)",
            description = "Quyền: event.create tại CLB. Kiểm tra startTime < endTime và registrationDeadline <= startTime.")
    public ResponseEntity<EventResponse> create(Actor actor,
                                                @PathVariable UUID clubId,
                                                @Valid @RequestBody CreateEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventService.create(actor, clubId, request));
    }

    @GetMapping("/clubs/{clubId}/events")
    @Operation(summary = "Danh sách sự kiện của CLB")
    public PageResponse<EventResponse> listForClub(Actor actor,
                                                   @PathVariable UUID clubId,
                                                   @RequestParam(required = false) EventStatus status,
                                                   @RequestParam(required = false) UUID departmentId,
                                                   @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                   @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return eventService.listForClub(actor, clubId, status, departmentId, offset, limit);
    }

    @GetMapping("/events/{eventId}")
    @Operation(summary = "Chi tiết sự kiện")
    public EventResponse get(Actor actor, @PathVariable UUID eventId) {
        return eventService.get(actor, eventId);
    }

    @PatchMapping("/clubs/{clubId}/events/{eventId}")
    @Operation(summary = "Cập nhật thông tin hoặc trạng thái sự kiện")
    public EventResponse update(Actor actor,
                                @PathVariable UUID clubId,
                                @PathVariable UUID eventId,
                                @Valid @RequestBody UpdateEventRequest request) {
        return eventService.update(actor, clubId, eventId, request);
    }

    @PostMapping("/events/{eventId}/registrations")
    @Operation(summary = "Đăng ký tham gia sự kiện (TC06)",
            description = "Hỗ trợ thành viên CLB và CTV (khi allowCtv=true). Chặn vượt maxParticipants (409 EVENT_FULL) và trùng đăng ký.")
    public ResponseEntity<EventRegistrationResponse> register(Actor actor,
                                                              @PathVariable UUID eventId,
                                                              @Valid @RequestBody(required = false) EventRegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventService.register(actor, eventId, request));
    }

    @PatchMapping("/events/{eventId}/registrations/me/cancel")
    @Operation(summary = "Hủy đăng ký tham gia sự kiện của tôi")
    public EventRegistrationResponse cancelRegistration(Actor actor, @PathVariable UUID eventId) {
        return eventService.cancelRegistration(actor, eventId);
    }

    @GetMapping("/events/{eventId}/registrations")
    @Operation(summary = "Danh sách người đã đăng ký sự kiện")
    public PageResponse<EventRegistrationResponse> listRegistrations(Actor actor,
                                                                     @PathVariable UUID eventId,
                                                                     @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                                     @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return eventService.listRegistrations(actor, eventId, offset, limit);
    }

    @PutMapping("/events/{eventId}/attendances")
    @Operation(summary = "Điểm danh sự kiện hàng loạt (TC07)",
            description = "Quyền: event.attendance tại CLB hoặc Ban tổ chức sự kiện. Trạng thái: PRESENT, ABSENT, LATE.")
    public List<EventAttendanceResponse> recordAttendance(Actor actor,
                                                          @PathVariable UUID eventId,
                                                          @Valid @RequestBody RecordAttendanceRequest request) {
        return eventService.recordAttendance(actor, eventId, request);
    }

    @GetMapping("/events/{eventId}/attendances")
    @Operation(summary = "Xem danh sách điểm danh của sự kiện")
    public List<EventAttendanceResponse> listAttendances(Actor actor, @PathVariable UUID eventId) {
        return eventService.listAttendances(actor, eventId);
    }

    @GetMapping("/users/me/calendar")
    @Operation(summary = "Lịch tổng hợp cá nhân (Sự kiện CLB + Deadline Task)")
    public List<CalendarItemResponse> getMyCalendar(
            Actor actor,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to) {
        return eventService.getMyCalendar(actor, from, to);
    }
}
