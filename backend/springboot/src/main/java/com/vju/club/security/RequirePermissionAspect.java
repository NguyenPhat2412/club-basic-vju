package com.vju.club.security;

import com.vju.club.modules.permission.annotation.RequirePermission;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Aspect
@Component
@RequiredArgsConstructor
public class RequirePermissionAspect {
    private final PermissionAuthorizationService authorizationService;

    @Before("@annotation(required)")
    public void check(JoinPoint joinPoint, RequirePermission required) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] names = signature.getParameterNames();
        Object[] args = joinPoint.getArgs();
        Actor actor = null;
        for (Object arg : args) {
            if (arg instanceof Actor candidate) actor = candidate;
        }
        if (actor == null) {
            throw new IllegalStateException("@RequirePermission needs an Actor argument: " + signature.toShortString());
        }
        authorizationService.require(actor, required.value(),
                uuidArgument(names, args, required.clubId(), signature),
                uuidArgument(names, args, required.departmentId(), signature));
    }

    private static UUID uuidArgument(String[] names, Object[] args, String name, MethodSignature signature) {
        if (name.isEmpty()) return null;
        for (int i = 0; i < names.length; i++) {
            if (names[i].equals(name)) {
                if (args[i] == null || args[i] instanceof UUID) return (UUID) args[i];
                break;
            }
        }
        throw new IllegalStateException("@RequirePermission refers to no UUID parameter '" + name + "' on "
                + signature.toShortString());
    }
}
