package com.vju.club.modules.user.dto.request;

import static com.vju.club.modules.user.common.UserConstants.PHONE_PATTERN;
import static com.vju.club.modules.user.common.UserConstants.WEB_URL_PATTERN;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

@JsonIgnoreProperties(ignoreUnknown = false)
public record AdminUpdateUserRequest(
        @Size(max = 200) String fullName,
        @Size(max = 50) String studentCode,
        @Size(max = 32) @Pattern(regexp = PHONE_PATTERN, message = "may only contain digits, spaces and + ( ) - .") String phone,
        @Size(max = 500) @URL(regexp = WEB_URL_PATTERN) String avatarUrl
) { }
