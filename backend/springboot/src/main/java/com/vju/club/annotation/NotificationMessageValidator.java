package com.vju.club.annotation;

import com.vju.club.common.NotificationConstants;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class NotificationMessageValidator implements ConstraintValidator<ValidNotificationMessage, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true;
        }
        return value.trim().length() <= NotificationConstants.MAX_MESSAGE_LENGTH;
    }
}
