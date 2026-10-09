package com.vju.club.modules.user.annotation;

import java.nio.charset.StandardCharsets;
import com.vju.club.modules.user.common.UserConstants;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PasswordValidator implements ConstraintValidator<ValidPassword, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true; // Let @NotBlank handle null/empty checks
        }
        return value.length() >= UserConstants.MIN_PASSWORD_LENGTH
                && value.getBytes(StandardCharsets.UTF_8).length <= UserConstants.MAX_PASSWORD_BYTES;
    }
}
