package com.vju.club.annotation;

import com.vju.club.common.ClubApplicationConstants;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ApplicationMessageValidator implements ConstraintValidator<ValidApplicationMessage, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true;
        }
        return value.trim().length() <= ClubApplicationConstants.MAX_MESSAGE_LENGTH;
    }
}
