package com.vju.club.modules.clubapplication.annotation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Documented
@Constraint(validatedBy = ApplicationMessageValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidApplicationMessage {

    String message() default "Application message exceeds maximum allowed length";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
