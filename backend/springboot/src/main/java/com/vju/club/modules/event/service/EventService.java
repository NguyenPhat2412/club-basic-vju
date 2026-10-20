package com.vju.club.modules.event.service;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.event.dto.request.CreateEventRequest;
import com.vju.club.modules.event.dto.request.EventRegistrationRequest;
import com.vju.club.modules.event.dto.request.RecordAttendanceRequest;
import com.vju.club.modules.event.dto.request.UpdateEventRequest;
import com.vju.club.modules.event.dto.response.CalendarItemResponse;
import com.vju.club.modules.event.dto.response.EventAttendanceResponse;
import com.vju.club.modules.event.dto.response.EventRegistrationResponse;
import com.vju.club.modules.event.dto.response.EventResponse;
import com.vju.club.modules.event.enums.EventStatus;
import com.vju.club.security.Actor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface EventService {
    PageResponse<EventResponse> listPublic(int offset, int limit);

    EventResponse create(Actor actor, UUID clubId, CreateEventRequest request);

    EventResponse update(Actor actor, UUID clubId, UUID eventId, UpdateEventRequest request);

    PageResponse<EventResponse> listForClub(Actor actor, UUID clubId, EventStatus status, UUID departmentId, int offset, int limit);

    EventResponse get(Actor actor, UUID eventId);

    EventRegistrationResponse register(Actor actor, UUID eventId, EventRegistrationRequest request);

    EventRegistrationResponse cancelRegistration(Actor actor, UUID eventId);

    PageResponse<EventRegistrationResponse> listRegistrations(Actor actor, UUID eventId, int offset, int limit);

    List<EventAttendanceResponse> recordAttendance(Actor actor, UUID eventId, RecordAttendanceRequest request);

    List<EventAttendanceResponse> listAttendances(Actor actor, UUID eventId);

    List<CalendarItemResponse> getMyCalendar(Actor actor, OffsetDateTime from, OffsetDateTime to);
}
