package com.vju.club.modules.user.dto.request;

import static com.vju.club.modules.user.common.UserConstants.PHONE_PATTERN;
import com.vju.club.modules.role.dto.request.AssignRoleRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import com.vju.club.modules.user.annotation.ValidPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateUserRequest(
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @ValidPassword String password,
        @NotBlank @Size(max = 200) String fullName,
        @Size(max = 50) String studentCode,
        @Size(max = 32) @Pattern(regexp = PHONE_PATTERN, message = "may only contain digits, spaces and + ( ) - .") String phone,
        Boolean requiresPasswordChange,
        @Size(max = 20) List<@NotNull @Valid AssignRoleRequest> roles
) { }
