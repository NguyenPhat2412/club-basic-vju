package com.vju.club.annotation.validator;

import com.vju.club.annotation.ValidClubCode;
import com.vju.club.common.ClubConstants;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class ClubCodeValidator implements ConstraintValidator<ValidClubCode, String> {
    private static final Pattern PATTERN = Pattern.compile(ClubConstants.CLUB_CODE_PATTERN);

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true;
        }
        return PATTERN.matcher(value.trim()).matches();
    }
}

