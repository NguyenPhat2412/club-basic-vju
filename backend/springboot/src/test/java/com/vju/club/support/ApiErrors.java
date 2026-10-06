package com.vju.club.support;

import com.vju.club.modules.permission.entity.Permission;

import com.vju.club.error.ApiException;
import org.assertj.core.api.ThrowableAssert;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public final class ApiErrors {
    private ApiErrors() { }

    public static final ApiException FORBIDDEN = new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");

    public static void assertApiError(ThrowableAssert.ThrowingCallable call, HttpStatus status, String code) {
        assertThatThrownBy(call).isInstanceOfSatisfying(ApiException.class, error -> {
            assertThat(error.getStatus()).isEqualTo(status);
            assertThat(error.getCode()).isEqualTo(code);
        });
    }
}
