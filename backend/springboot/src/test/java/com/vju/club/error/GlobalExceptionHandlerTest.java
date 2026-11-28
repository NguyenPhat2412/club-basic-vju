package com.vju.club.error;

import com.vju.club.service.TelegramAlertService;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ProblemDetail;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class GlobalExceptionHandlerTest {
    @Test
    void pendingApplicationUniqueConstraintMapsToPendingConflict() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        DataIntegrityViolationException exception = new DataIntegrityViolationException(
                "duplicate key value violates unique constraint uq_club_applications_pending");

        var response = handler.handleDataIntegrity(exception);

        ProblemDetail body = response.getBody();
        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(body).isNotNull();
        assertThat(body.getProperties()).containsEntry("code", "APPLICATION_ALREADY_PENDING");
    }

    @Test
    void clientDisconnectAbortsQuietlyWithoutWriting500BodyToClosedSocket() {
        TelegramAlertService telegram = mock(TelegramAlertService.class);
        GlobalExceptionHandler handler = new GlobalExceptionHandler(telegram);
        RuntimeException wrapped = new RuntimeException(
                "ServletOutputStream failed to write",
                new AsyncRequestNotUsableException("Connection reset by peer", new IOException("Connection reset by peer")));

        var response = handler.handleUnexpectedException(wrapped);

        assertThat(response).isNull();
        verifyNoInteractions(telegram);
    }

    @Test
    void unexpected500DispatchesSanitizedTelegramAlert() {
        TelegramAlertService telegram = mock(TelegramAlertService.class);
        GlobalExceptionHandler handler = new GlobalExceptionHandler(telegram);
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/notifications/campaigns");
        req.setRemoteAddr("10.0.0.5");
        req.addHeader("CF-Connecting-IP", "203.0.113.42");

        var response = handler.handleUnexpectedException(new IllegalStateException("DB pool exhausted"), req);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        verify(telegram).sendAlertAsync(
                eq("server_500:POST:/api/v1/notifications/campaigns:IllegalStateException"),
                eq("Lỗi máy chủ (HTTP 500)"),
                contains("203.0.113.42"));
    }
}
