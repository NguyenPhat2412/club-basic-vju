package com.vju.club.security;

import com.vju.club.annotation.ValidClubCode;
import com.vju.club.annotation.ValidPassword;
import com.vju.club.config.RateLimitProperties;
import com.vju.club.dto.request.ClubRequest;
import com.vju.club.dto.request.CreateClubApplicationRequest;
import com.vju.club.dto.request.LoginRequest;
import com.vju.club.dto.request.TranslateBatchRequest;
import com.vju.club.dto.request.UpdateClubApplicationRequest;
import com.vju.club.dto.request.UpdateProfileRequest;
import com.vju.club.dto.request.UpdateTaskProgressRequest;
import jakarta.validation.Valid;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import jakarta.validation.constraints.Size;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.core.type.filter.RegexPatternTypeFilter;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.lang.reflect.RecordComponent;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityAndInputBoundsTest {
    private static Validator validator;

    @BeforeAll
    static void initValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void everyControllerRequestBodyHasValidAndEveryStringParamHasSizeBound() throws Exception {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));

        List<Class<?>> controllers = new ArrayList<>();
        for (var candidate : scanner.findCandidateComponents("com.vju.club.controller")) {
            controllers.add(Class.forName(candidate.getBeanClassName()));
        }
        assertThat(controllers).hasSizeGreaterThanOrEqualTo(20);

        for (Class<?> controller : controllers) {
            for (Method method : controller.getDeclaredMethods()) {
                for (Parameter param : method.getParameters()) {
                    String loc = controller.getSimpleName() + "." + method.getName() + "(" + param.getName() + ")";
                    if (param.isAnnotationPresent(RequestBody.class)) {
                        assertThat(param.isAnnotationPresent(Valid.class))
                                .as(loc + " @RequestBody must carry @Valid")
                                .isTrue();
                    }
                    if ((param.isAnnotationPresent(RequestParam.class) || param.isAnnotationPresent(PathVariable.class))
                            && param.getType() == String.class
                            && !param.isAnnotationPresent(RequestHeader.class)) {
                        assertThat(param.isAnnotationPresent(Size.class))
                                .as(loc + " String @RequestParam/@PathVariable must carry @Size(max = ...)")
                                .isTrue();
                    }
                }
            }
        }
    }

    @Test
    void everyRequestDtoStringCollectionAndMapHasExplicitUpperBound() throws Exception {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new RegexPatternTypeFilter(Pattern.compile("com\\.vju\\.club\\.dto\\.request\\..*")));

        List<Class<?>> dtos = new ArrayList<>();
        for (var candidate : scanner.findCandidateComponents("com.vju.club.dto.request")) {
            Class<?> cls = Class.forName(candidate.getBeanClassName());
            if (cls.isRecord()) dtos.add(cls);
        }
        assertThat(dtos).hasSizeGreaterThanOrEqualTo(50);

        for (Class<?> dto : dtos) {
            for (RecordComponent rc : dto.getRecordComponents()) {
                String loc = dto.getSimpleName() + "." + rc.getName();
                var field = dto.getDeclaredField(rc.getName());
                Class<?> type = rc.getType();
                Size size = field.getAnnotation(Size.class);
                if (size == null && field.getAnnotatedType() != null) {
                    size = field.getAnnotatedType().getAnnotation(Size.class);
                }
                if (type == String.class) {
                    boolean bounded = size != null
                            || field.isAnnotationPresent(ValidPassword.class)
                            || rc.isAnnotationPresent(ValidPassword.class)
                            || field.isAnnotationPresent(ValidClubCode.class)
                            || rc.isAnnotationPresent(ValidClubCode.class);
                    assertThat(bounded)
                            .as(loc + " String component must have @Size, @ValidPassword, or @ValidClubCode")
                            .isTrue();
                    if (size != null) {
                        assertThat(size.max())
                                .as(loc + " @Size.max must be finite (< Integer.MAX_VALUE)")
                                .isLessThan(Integer.MAX_VALUE);
                    }
                }
                if (Collection.class.isAssignableFrom(type) || Map.class.isAssignableFrom(type)) {
                    assertThat(size)
                            .as(loc + " Collection/Map component must have @Size(max = ...)")
                            .isNotNull();
                    assertThat(size.max())
                            .as(loc + " Collection/Map @Size.max must be finite (< Integer.MAX_VALUE)")
                            .isLessThan(Integer.MAX_VALUE);
                }
            }
        }
    }

    @Test
    void rejectsUnsafeUrlSchemesAcrossAllUserSuppliedUrlFields() {
        for (String maliciousUrl : List.of(
                "javascript:alert(document.cookie)",
                "data:text/html,<script>alert(1)</script>",
                "vbscript:msgbox(1)",
                "file:///etc/passwd")) {
            assertThat(validator.validate(new UpdateTaskProgressRequest(null, 50, "ok", maliciousUrl)))
                    .as("UpdateTaskProgressRequest.reportLink must reject " + maliciousUrl)
                    .isNotEmpty();
            assertThat(validator.validate(new CreateClubApplicationRequest(
                    "Xin gia nhập CLB", null, null, null, null, null, null, null,
                    maliciousUrl, null, null, null, null, null)))
                    .as("CreateClubApplicationRequest.socialPortfolioUrl must reject " + maliciousUrl)
                    .isNotEmpty();
            assertThat(validator.validate(new UpdateClubApplicationRequest(
                    null, null, null, null, null, null, maliciousUrl,
                    null, null, null, "Cập nhật", null)))
                    .as("UpdateClubApplicationRequest.socialPortfolioUrl must reject " + maliciousUrl)
                    .isNotEmpty();
            assertThat(validator.validate(new ClubRequest("VJUTEST", "CLB Test", maliciousUrl, null, null, null, null)))
                    .as("ClubRequest.logoUrl must reject " + maliciousUrl)
                    .isNotEmpty();
            assertThat(validator.validate(new UpdateProfileRequest("Nguyen Van A", null, maliciousUrl)))
                    .as("UpdateProfileRequest.avatarUrl must reject " + maliciousUrl)
                    .isNotEmpty();
        }

        assertThat(validator.validate(new UpdateTaskProgressRequest(null, 50, "ok", "https://drive.google.com/file/d/123")))
                .isEmpty();
    }

    @Test
    void rejectsOversizedLoginPasswordsAndOversizedTranslationBatchItems() {
        String hugePassword = "A".repeat(1024);
        assertThat(validator.validate(new LoginRequest("student@vju.ac.vn", hugePassword))).isNotEmpty();

        String hugeText = "Xin chào ".repeat(400);
        assertThat(validator.validate(new TranslateBatchRequest("en", List.of(hugeText)))).isNotEmpty();
        assertThat(validator.validate(new TranslateBatchRequest("en", List.of("Câu lạc bộ VJU")))).isEmpty();
    }

    @Test
    void rateLimitServiceCapsTrackedKeysAgainstHeapExhaustion() {
        RateLimitProperties props = new RateLimitProperties();
        props.setEnabled(true);
        props.setMaxRequests(5);
        props.setWindow(Duration.ofMinutes(1));
        RateLimitService service = new RateLimitService(props, Clock.systemUTC());

        for (int i = 0; i < 10_000; i++) {
            assertThat(service.check("route:10.0." + (i / 256) + "." + (i % 256)).allowed()).isTrue();
        }
        RateLimitDecision overflow = service.check("route:192.168.99.99");
        assertThat(overflow.allowed()).isFalse();
        assertThat(service.trackedKeys()).isEqualTo(10_000);
    }
}
