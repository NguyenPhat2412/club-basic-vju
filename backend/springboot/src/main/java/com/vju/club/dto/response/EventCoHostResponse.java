package com.vju.club.dto.response;

import java.io.Serializable;
import java.util.UUID;

public record EventCoHostResponse(
        UUID clubId,
        String clubCode,
        String clubName
) implements Serializable {
}
