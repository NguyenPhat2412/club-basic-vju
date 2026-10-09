package com.vju.club.modules.permission.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declares the permission a service method needs; {@code RequirePermissionAspect} checks it before
 * the method runs and answers 403 otherwise. The method must take an {@code Actor} argument.
 *
 * <p>Scope: with neither {@code clubId} nor {@code departmentId} the permission must be held
 * globally. Naming a {@code UUID} parameter also accepts a grant for that club or department.
 *
 * <p>Use it only where the scope is known from the arguments. When the club is only known after
 * loading an entity (e.g. a department's club), keep the explicit
 * {@code PermissionAuthorizationService.require(...)} call. Like all Spring AOP, it does not apply
 * when the method is called from inside the same class.
 */
@Documented
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePermission {

    /** Permission key, e.g. {@code club.update}. */
    String value();

    /** Name of the method parameter holding the club id, if the grant may be club-scoped. */
    String clubId() default "";

    /** Name of the method parameter holding the department id, if the grant may be department-scoped. */
    String departmentId() default "";
}
