package com.vju.club.modules.club.dto.request;

import static com.vju.club.modules.user.common.UserConstants.WEB_URL_PATTERN;
import org.hibernate.validator.constraints.URL;
import com.vju.club.modules.club.annotation.ValidClubCode;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClubRequest(
        @NotBlank @Size(max = 50) @ValidClubCode String code,
        @NotBlank @Size(max = 200) String name,
        @Size(max = 500) @URL(regexp = WEB_URL_PATTERN) String logoUrl,
        @Size(max = 500) @URL(regexp = WEB_URL_PATTERN) String coverUrl,
        @Size(max = 2000) String description,
        @Size(max = 200) String activityField,
        @Email @Size(max = 320) String contactEmail
) { }
