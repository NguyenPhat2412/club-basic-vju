package com.vju.club.error;

import com.vju.club.security.RequestMetadataExtractor;
import com.vju.club.service.TelegramAlertService;
import com.vju.club.service.impl.TelegramAlertServiceImpl;
import jakarta.persistence.OptimisticLockException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.lang.Nullable;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @Nullable
    private final TelegramAlertService telegramAlertService;

    public GlobalExceptionHandler() {
        this(null);
    }

    @Autowired
    public GlobalExceptionHandler(@Nullable TelegramAlertService telegramAlertService) {
        this.telegramAlertService = telegramAlertService;
    }

    private static final Map<String, String> CONSTRAINT_CODES = new LinkedHashMap<>();

    static {
        CONSTRAINT_CODES.put("uq_users_email_ci", "EMAIL_ALREADY_EXISTS");
        CONSTRAINT_CODES.put("uq_users_student_code_ci", "STUDENT_CODE_ALREADY_EXISTS");
        CONSTRAINT_CODES.put("uq_clubs_code_ci", "CLUB_CODE_ALREADY_EXISTS");
        CONSTRAINT_CODES.put("uq_departments_club_name_ci", "DEPARTMENT_NAME_ALREADY_EXISTS");
        CONSTRAINT_CODES.put("fk_department_members_membership_club", "CROSS_CLUB_ASSIGNMENT");
        CONSTRAINT_CODES.put("uq_memberships_user_club_current", "MEMBERSHIP_ALREADY_EXISTS");
        CONSTRAINT_CODES.put("uq_department_members_assignment", "DEPARTMENT_MEMBER_ALREADY_EXISTS");
        CONSTRAINT_CODES.put("uq_user_permissions_active_", "PERMISSION_ALREADY_GRANTED");
        CONSTRAINT_CODES.put("uq_user_roles_active_", "ROLE_ALREADY_ASSIGNED");
        CONSTRAINT_CODES.put("uq_roles_code_ci", "ROLE_CODE_ALREADY_EXISTS");
        CONSTRAINT_CODES.put("uq_club_applications_pending", "APPLICATION_ALREADY_PENDING");
        CONSTRAINT_CODES.put("uq_event_registrations_active", "ALREADY_REGISTERED");
        CONSTRAINT_CODES.put("uq_notifications_user_event_key", "DUPLICATE_NOTIFICATION_EVENT");
        CONSTRAINT_CODES.put("uq_documents_system_name_live", "DOCUMENT_NAME_ALREADY_EXISTS");
        CONSTRAINT_CODES.put("uq_documents_club_dept_name_live", "DOCUMENT_NAME_ALREADY_EXISTS");
        CONSTRAINT_CODES.put("uq_documents_club_name_live", "DOCUMENT_NAME_ALREADY_EXISTS");
        CONSTRAINT_CODES.put("uq_documents_path", "DOCUMENT_VERSION_CONFLICT");
        CONSTRAINT_CODES.put("uq_document_versions_path", "DOCUMENT_VERSION_CONFLICT");
        CONSTRAINT_CODES.put("ck_documents_scope_target", "VALIDATION_ERROR");
        CONSTRAINT_CODES.put("uq_document_versions_number", "DOCUMENT_VERSION_CONFLICT");
        CONSTRAINT_CODES.put("ck_document_versions_sequence", "DOCUMENT_VERSION_CONFLICT");
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ProblemDetail> handleApiException(ApiException exception) {
        return problem(exception.getStatus(), exception.getCode(), exception.getMessage());
    }

    @ExceptionHandler({ObjectOptimisticLockingFailureException.class, OptimisticLockException.class, PessimisticLockingFailureException.class})
    ResponseEntity<ProblemDetail> handleConcurrencyLock(Exception exception) {
        return problem(HttpStatus.CONFLICT, "OPTIMISTIC_LOCK_CONFLICT",
                "The record was modified concurrently by another user; please reload and try again");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ProblemDetail> handleDataIntegrity(DataIntegrityViolationException exception) {
        String message = String.valueOf(exception.getMostSpecificCause().getMessage());
        for (Map.Entry<String, String> entry : CONSTRAINT_CODES.entrySet()) {
            if (message.contains(entry.getKey())) {
                HttpStatus status = "VALIDATION_ERROR".equals(entry.getValue())
                        ? HttpStatus.BAD_REQUEST : HttpStatus.CONFLICT;
                return problem(status, entry.getValue(), "Resource conflicts with existing data");
            }
        }
        log.warn("Unmapped data integrity violation: {}", message);
        return problem(HttpStatus.CONFLICT, "DATA_CONFLICT", "Request conflicts with existing data");
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ProblemDetail> handleConstraintViolation(ConstraintViolationException exception) {
        String detail = exception.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining(", "));
        return problem(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                detail.isBlank() ? "Invalid request parameter" : detail);
    }

    @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
    ResponseEntity<ProblemDetail> handleMissingAuthentication(AuthenticationCredentialsNotFoundException exception) {
        return problem(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication is required");
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ProblemDetail> handleAuthenticationException(AuthenticationException exception) {
        return problem(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    @ExceptionHandler(AuthorizationDeniedException.class)
    ResponseEntity<ProblemDetail> handleAuthorizationDenied(AuthorizationDeniedException exception) {
        return problem(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ProblemDetail> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        return problem(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                "Invalid value for parameter '" + exception.getName() + "'");
    }

    @ExceptionHandler(MultipartException.class)
    ResponseEntity<ProblemDetail> handleMultipartException(MultipartException exception, HttpServletRequest request) {
        if (exception instanceof MaxUploadSizeExceededException) {
            String code = isMediaUploadUri(request != null ? request.getRequestURI() : null)
                    ? "IMAGE_TOO_LARGE" : "DOCUMENT_TOO_LARGE";
            return problem(HttpStatus.PAYLOAD_TOO_LARGE, code, "File is larger than the allowed maximum");
        }
        return problem(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid multipart file upload request");
    }

    ResponseEntity<ProblemDetail> handleUnexpectedException(Exception exception) {
        return handleUnexpectedException(exception, null);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> handleUnexpectedException(Exception exception, @Nullable HttpServletRequest request) {
        if (isClientDisconnect(exception)) {
            log.debug("Client disconnected before response completed: {}", exception.getMessage());
            return null;
        }
        log.error("Unhandled exception", exception);
        notifyServerError(exception, request);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An unexpected error occurred");
    }

    private void notifyServerError(Exception exception, @Nullable HttpServletRequest request) {
        if (telegramAlertService == null) {
            return;
        }
        try {
            String method = request != null && request.getMethod() != null ? request.getMethod() : "UNKNOWN";
            String uri = request != null && request.getRequestURI() != null ? request.getRequestURI() : "unknown";
            String ip = request != null
                    ? RequestMetadataExtractor.extract(request).ipAddress()
                    : RequestMetadataExtractor.extractCurrent().ipAddress();
            String exType = exception.getClass().getSimpleName();
            String rawMsg = exception.getMessage() == null ? "No message" : exception.getMessage().replaceAll("\\s+", " ").trim();
            String safeMsg = rawMsg.length() > 180 ? rawMsg.substring(0, 180) + "…" : rawMsg;
            String dedupeKey = "server_500:" + method + ":" + uri + ":" + exType;
            String htmlBody = """
                    • Endpoint: <code>%s %s</code>
                    • Loại lỗi: <code>%s</code>
                    • Chi tiết: <code>%s</code>
                    • IP yêu cầu: <code>%s</code>"""
                    .formatted(
                            TelegramAlertServiceImpl.escapeHtml(method),
                            TelegramAlertServiceImpl.escapeHtml(uri),
                            TelegramAlertServiceImpl.escapeHtml(exType),
                            TelegramAlertServiceImpl.escapeHtml(safeMsg),
                            TelegramAlertServiceImpl.escapeHtml(ip == null ? "unknown" : ip));
            telegramAlertService.sendAlertAsync(dedupeKey, "Lỗi máy chủ (HTTP 500)", htmlBody);
        } catch (Exception alertEx) {
            log.debug("Could not dispatch Telegram 500 alert: {}", alertEx.getMessage());
        }
    }

    private static boolean isClientDisconnect(Throwable throwable) {
        for (Throwable cur = throwable; cur != null; cur = cur.getCause()) {
            if (cur instanceof AsyncRequestNotUsableException) {
                return true;
            }
            String className = cur.getClass().getName();
            if (className.endsWith("ClientAbortException")) {
                return true;
            }
            if (cur instanceof java.io.IOException ioEx) {
                String msg = ioEx.getMessage();
                if (msg != null && (msg.contains("Broken pipe") || msg.contains("Connection reset by peer"))) {
                    return true;
                }
            }
        }
        return false;
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Stream<String> fieldErrors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage());
        Stream<String> globalErrors = exception.getBindingResult().getGlobalErrors().stream()
                .map(error -> error.getObjectName() + ": " + error.getDefaultMessage());
        String detail = Stream.concat(fieldErrors, globalErrors).collect(Collectors.joining(", "));
        return asObject(problem(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", detail));
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(
            HandlerMethodValidationException exception, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String detail = exception.getParameterValidationResults().stream()
                .flatMap(result -> result.getResolvableErrors().stream()
                        .map(error -> result.getMethodParameter().getParameterName() + ": " + error.getDefaultMessage()))
                .collect(Collectors.joining(", "));
        return asObject(problem(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", detail));
    }

    @Override
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(
            MaxUploadSizeExceededException exception, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String uri = request instanceof ServletWebRequest swr ? swr.getRequest().getRequestURI() : null;
        String code = isMediaUploadUri(uri) ? "IMAGE_TOO_LARGE" : "DOCUMENT_TOO_LARGE";
        return asObject(problem(HttpStatus.PAYLOAD_TOO_LARGE, code, "File is larger than the allowed maximum"));
    }

    private static boolean isMediaUploadUri(String uri) {
        return uri != null && (uri.endsWith("/logo") || uri.endsWith("/cover"));
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException exception, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return asObject(problem(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Request body is invalid"));
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception exception, Object body, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = body instanceof ProblemDetail detail
                ? detail : ProblemDetail.forStatus(status);
        String code = codeFor(status);
        problem.setTitle(code);
        problem.setProperty("code", code);
        if (status.is5xxServerError()) {
            log.error("Framework error", exception);
            HttpServletRequest servletReq = request instanceof ServletWebRequest swr ? swr.getRequest() : null;
            notifyServerError(exception, servletReq);
        }
        return new ResponseEntity<>(problem, headers, status);
    }

    private static String codeFor(HttpStatusCode status) {
        if (status.value() == 400) return "VALIDATION_ERROR";
        HttpStatus resolved = HttpStatus.resolve(status.value());
        return resolved == null ? "HTTP_" + status.value() : resolved.name();
    }

    private static ResponseEntity<ProblemDetail> problem(HttpStatusCode status, String code, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(code);
        problem.setProperty("code", code);
        return ResponseEntity.status(status).body(problem);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static ResponseEntity<Object> asObject(ResponseEntity<ProblemDetail> response) {
        return (ResponseEntity) response;
    }
}
