package com.vju.club.service;

import com.vju.club.dto.request.QrAttendanceCheckInRequest;
import com.vju.club.dto.response.EventAttendanceQrTokenResponse;
import com.vju.club.dto.response.EventAttendanceResponse;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface EventAttendanceQrService {
    EventAttendanceQrTokenResponse issueQrToken(Actor actor, UUID eventId);

    EventAttendanceResponse checkInWithQr(Actor actor, UUID eventId, QrAttendanceCheckInRequest request);
}
