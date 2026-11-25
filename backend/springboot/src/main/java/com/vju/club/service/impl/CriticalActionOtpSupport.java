package com.vju.club.service.impl;

import com.vju.club.service.TwoFactorOtpService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.UUID;

final class CriticalActionOtpSupport {
    static final String OTP_HEADER = "X-2FA-OTP";

    private CriticalActionOtpSupport() {
    }

    static String resolveOtp(String explicitOtp) {
        if (explicitOtp != null && !explicitOtp.isBlank()) {
            return explicitOtp.trim();
        }
        var attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes servletAttrs) {
            HttpServletRequest request = servletAttrs.getRequest();
            String header = request.getHeader(OTP_HEADER);
            if (header != null && !header.isBlank()) {
                return header.trim();
            }
        }
        return null;
    }

    static void requireIfEnabled(
            TwoFactorOtpService twoFactorOtpService,
            UUID actorId,
            String actionContext,
            String explicitOtp) {
        if (twoFactorOtpService == null || actorId == null) {
            return;
        }
        twoFactorOtpService.requireCriticalActionOtpIfEnabled(actorId, actionContext, resolveOtp(explicitOtp));
    }
}
