package com.vju.club.modules.role.annotation;

import com.vju.club.modules.role.common.RoleConstants;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class RoleNameValidator implements ConstraintValidator<ValidRoleName, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true;
        }
        return value.trim().length() <= RoleConstants.MAX_NAME_LENGTH;
    }
}
