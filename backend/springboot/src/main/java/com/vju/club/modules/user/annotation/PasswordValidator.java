package com.vju.club.modules.user.annotation;

import com.vju.club.modules.user.common.UserConstants;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PasswordValidator implements ConstraintValidator<ValidPassword, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true; // Let @NotBlank handle null/empty checks
        }
        return value.length() >= UserConstants.MIN_PASSWORD_LENGTH;
    }
}
