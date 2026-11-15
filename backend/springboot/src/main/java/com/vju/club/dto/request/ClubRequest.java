package com.vju.club.dto.request;

import static com.vju.club.common.UserConstants.WEB_URL_PATTERN;
import com.vju.club.annotation.ValidClubCode;
import com.vju.club.dto.record.ClubOverviewConfig;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

public record ClubRequest(
        @NotBlank @Size(max = 50) @ValidClubCode String code,
        @NotBlank @Size(max = 200) String name,
        @Size(max = 500) @URL(regexp = WEB_URL_PATTERN) String logoUrl,
        @Size(max = 500) @URL(regexp = WEB_URL_PATTERN) String coverUrl,
        @Size(max = 2000) String description,
        @Size(max = 200) String activityField,
        @Email @Size(max = 320) String contactEmail,
        ClubOverviewConfig overviewConfig
) {
    public ClubRequest(
            String code,
            String name,
            String logoUrl,
            String coverUrl,
            String description,
            String activityField,
            String contactEmail
    ) {
        this(code, name, logoUrl, coverUrl, description, activityField, contactEmail, null);
    }
}
