package com.vju.club.dto.response;

import java.util.List;
import java.util.UUID;

public record ClubStructureResponse(
        UUID clubId,
        List<ClubPositionSlotResponse> clubPositions,
        List<ClubPositionSlotResponse> departmentPositions
) { }
