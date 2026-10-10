package com.vju.club.support;

import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.RequirePermissionAspect;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;

public final class PermissionChecks {
    private PermissionChecks() { }

    public static <T> T withPermissionChecks(T service, PermissionAuthorizationService authorization) {
        AspectJProxyFactory factory = new AspectJProxyFactory(service);
        factory.setProxyTargetClass(true);
        factory.addAspect(new RequirePermissionAspect(authorization));
        return factory.getProxy();
    }
}
