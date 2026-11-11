package com.vju.club.dto.response;

import java.util.List;

/** Application counts per status, plus the newest few, across every club the caller may review. */
public record ApplicationStatusCountsResponse(long pending, long approved, long rejected, long cancelled, long total,
                                             List<ClubApplicationSummaryResponse> recent) {
}
