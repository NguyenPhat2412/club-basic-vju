package com.vju.club.support;

import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.RequirePermissionAspect;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;

/** Wraps a hand-built service the way Spring does, so @RequirePermission is enforced in unit tests too. */
public final class PermissionChecks {
    private PermissionChecks() { }

    public static <T> T withPermissionChecks(T service, PermissionAuthorizationService authorization) {
        AspectJProxyFactory factory = new AspectJProxyFactory(service);
        factory.setProxyTargetClass(true);
        factory.addAspect(new RequirePermissionAspect(authorization));
        return factory.getProxy();
    }
}
