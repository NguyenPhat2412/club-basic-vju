package com.vju.club.modules.club.annotation;

import com.vju.club.modules.club.common.ClubConstants;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class ClubCodeValidator implements ConstraintValidator<ValidClubCode, String> {

    private static final Pattern PATTERN = Pattern.compile(ClubConstants.CLUB_CODE_PATTERN);

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true; // Let @NotBlank handle null/empty checks
        }
        return PATTERN.matcher(value.trim()).matches();
    }
}
