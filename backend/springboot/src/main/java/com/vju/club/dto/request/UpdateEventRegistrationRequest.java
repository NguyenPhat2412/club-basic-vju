package com.vju.club.dto.request;

import com.vju.club.enums.EventParticipantType;
import com.vju.club.enums.EventRegistrationStatus;
import jakarta.validation.constraints.Size;

public record UpdateEventRegistrationRequest(
        @Size(max = 100) String eventRole,
        EventRegistrationStatus status,
        @Size(max = 500) String note,
        EventParticipantType participantType
) {
    public UpdateEventRegistrationRequest(String eventRole, EventRegistrationStatus status, String note) {
        this(eventRole, status, note, null);
    }
}
