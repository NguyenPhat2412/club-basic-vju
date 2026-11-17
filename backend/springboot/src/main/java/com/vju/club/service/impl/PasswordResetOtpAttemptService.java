package com.vju.club.service.impl;

import com.vju.club.entity.PasswordResetOtp;
import com.vju.club.repository.PasswordResetOtpRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PasswordResetOtpAttemptService {
    private final PasswordResetOtpRepository otpRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int recordFailedAttempt(UUID otpId, OffsetDateTime now) {
        PasswordResetOtp otp = otpRepository.findById(otpId).orElse(null);
        if (otp == null) {
            return 0;
        }
        int nextAttempts = otp.getAttempts() + 1;
        otp.setAttempts(nextAttempts);
        if (nextAttempts >= otp.getMaxAttempts() && otp.getInvalidatedAt() == null) {
            otp.setInvalidatedAt(now);
        }
        otpRepository.saveAndFlush(otp);
        return nextAttempts;
    }
}
