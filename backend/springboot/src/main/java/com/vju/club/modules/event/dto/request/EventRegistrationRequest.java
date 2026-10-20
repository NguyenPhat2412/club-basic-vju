package com.vju.club.modules.event.dto.request;

import jakarta.validation.constraints.Size;

public record EventRegistrationRequest(
        @Size(max = 500) String note
) {
}
