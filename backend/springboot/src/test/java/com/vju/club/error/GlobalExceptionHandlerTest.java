package com.vju.club.error;

import com.vju.club.config.RuntimeIntegrationConfig;
import com.vju.club.service.TelegramAlertService;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

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

    @Test
    void brokenPipeInFrameworkWriteDoesNotTriggerFalse500TelegramAlert() {
        TelegramAlertService telegram = mock(TelegramAlertService.class);
        GlobalExceptionHandler handler = new GlobalExceptionHandler(telegram);
        HttpMessageNotWritableException ex = new HttpMessageNotWritableException(
                "Could not write JSON", new IOException("Broken pipe"));
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/api-catalog");

        var response = handler.handleExceptionInternal(
                ex, null, HttpHeaders.EMPTY, HttpStatus.INTERNAL_SERVER_ERROR, new ServletWebRequest(req));

        assertThat(response).isNull();
        verifyNoInteractions(telegram);
    }

    @Test
    void unexpected500RespectsTelegramAlertOnServerErrorToggle() {
        TelegramAlertService telegram = mock(TelegramAlertService.class);
        RuntimeIntegrationConfig cfg = mock(RuntimeIntegrationConfig.class);
        when(cfg.telegram()).thenReturn(new RuntimeIntegrationConfig.EffectiveTelegram(
                true, "tok", "-1001", "", "https://api.telegram.org",
                true, 5, true, true, true, false, true, 180));
        GlobalExceptionHandler handler = new GlobalExceptionHandler(telegram, cfg);
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/clubs");

        var response = handler.handleUnexpectedException(new RuntimeException("boom"), req);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        verifyNoInteractions(telegram);
    }
}
