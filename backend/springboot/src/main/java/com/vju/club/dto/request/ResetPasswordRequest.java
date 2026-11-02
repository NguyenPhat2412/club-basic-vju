package com.vju.club.dto.request;

import com.vju.club.annotation.ValidPassword;
import jakarta.validation.constraints.NotBlank;

public record ResetPasswordRequest(@NotBlank @ValidPassword String newPassword, Boolean requiresPasswordChange) { }
