package com.vju.club.dto.request;

import com.vju.club.enums.EventParticipantType;
import jakarta.validation.constraints.Size;

public record EventRegistrationRequest(
        @Size(max = 500) String note,
        EventParticipantType participantType
) {
    public EventRegistrationRequest(String note) {
        this(note, null);
    }
}
