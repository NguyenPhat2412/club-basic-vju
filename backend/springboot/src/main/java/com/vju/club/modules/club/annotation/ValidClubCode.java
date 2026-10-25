package com.vju.club.modules.club.annotation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Documented
@Constraint(validatedBy = ClubCodeValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidClubCode {
    String message() default "Invalid club code format (must be 2-50 alphanumeric characters, dots, underscores, or hyphens)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
