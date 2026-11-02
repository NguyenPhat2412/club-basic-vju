package com.vju.club.annotation;

import com.vju.club.common.DepartmentConstants;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class DepartmentNameValidator implements ConstraintValidator<ValidDepartmentName, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true;
        }
        return value.trim().length() <= DepartmentConstants.MAX_NAME_LENGTH;
    }
}
