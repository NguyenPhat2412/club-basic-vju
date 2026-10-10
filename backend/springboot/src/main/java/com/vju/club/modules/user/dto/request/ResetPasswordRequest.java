package com.vju.club.modules.user.dto.request;

import com.vju.club.modules.user.annotation.ValidPassword;
import jakarta.validation.constraints.NotBlank;

public record ResetPasswordRequest(@NotBlank @ValidPassword String newPassword) { }
