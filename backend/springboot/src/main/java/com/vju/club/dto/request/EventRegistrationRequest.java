package com.vju.club.dto.request;

import com.vju.club.enums.EventParticipantType;
import jakarta.validation.constraints.Size;

public record EventRegistrationRequest(
        @Size(max = 500) String note,
        EventParticipantType participantType,
        Boolean needsShuttleBus
) {
    public EventRegistrationRequest(String note) {
        this(note, null, null);
    }

    public EventRegistrationRequest(String note, EventParticipantType participantType) {
        this(note, participantType, null);
    }
}
