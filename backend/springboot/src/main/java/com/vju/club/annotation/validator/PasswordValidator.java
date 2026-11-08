package com.vju.club.annotation.validator;

import com.vju.club.annotation.ValidPassword;
import com.vju.club.common.UserConstants;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.nio.charset.StandardCharsets;

public class PasswordValidator implements ConstraintValidator<ValidPassword, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true;
        }
        return value.length() >= UserConstants.MIN_PASSWORD_LENGTH
                && value.getBytes(StandardCharsets.UTF_8).length <= UserConstants.MAX_PASSWORD_BYTES;
    }
}

