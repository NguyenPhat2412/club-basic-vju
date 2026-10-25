package com.vju.club.modules.clubapplication.annotation;

import com.vju.club.modules.clubapplication.common.ClubApplicationConstants;
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
