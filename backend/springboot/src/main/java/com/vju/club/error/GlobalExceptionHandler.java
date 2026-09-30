package com.vju.club.error;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Every error leaves the API as a ProblemDetail with a stable {@code code}. Framework errors
 * (unknown route, wrong method, missing parameter, ...) keep their real HTTP status instead of
 * falling through to 500.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Database constraint name -> API error code, for races that slip past service-level checks. */
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
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ProblemDetail> handleApiException(ApiException exception) {
        return problem(exception.getStatus(), exception.getCode(), exception.getMessage());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ProblemDetail> handleDataIntegrity(DataIntegrityViolationException exception) {
        String message = String.valueOf(exception.getMostSpecificCause().getMessage());
        for (Map.Entry<String, String> entry : CONSTRAINT_CODES.entrySet()) {
            if (message.contains(entry.getKey())) {
                return problem(HttpStatus.CONFLICT, entry.getValue(), "Resource conflicts with existing data");
            }
        }
        log.warn("Unmapped data integrity violation: {}", message);
        return problem(HttpStatus.CONFLICT, "DATA_CONFLICT", "Request conflicts with existing data");
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

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> handleUnexpectedException(Exception exception) {
        log.error("Unhandled exception", exception);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An unexpected error occurred");
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String detail = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
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
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException exception, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return asObject(problem(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Request body is invalid"));
    }

    /** Gives every remaining framework exception our {@code code}/{@code title} convention. */
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
