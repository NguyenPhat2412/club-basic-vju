package com.vju.club.modules.club.dto.request;

import com.vju.club.modules.club.annotation.ValidClubCode;
import static com.vju.club.modules.user.common.UserConstants.WEB_URL_PATTERN;
import org.hibernate.validator.constraints.URL;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record ClubPatchRequest(
        @Size(max = 50) @ValidClubCode String code,
        @Size(max = 200) String name,
        @Size(max = 500) @URL(regexp = WEB_URL_PATTERN) String logoUrl,
        @Size(max = 500) @URL(regexp = WEB_URL_PATTERN) String coverUrl,
        @Size(max = 2000) String description,
        @Size(max = 200) String activityField,
        @Email @Size(max = 320) String contactEmail
) { }
