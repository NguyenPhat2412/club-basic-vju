package com.vju.club.security;

import com.vju.club.modules.permission.annotation.RequirePermission;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.stereotype.Service;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RequirePermissionUsageTest {
    private static List<Method> annotatedMethods() throws ClassNotFoundException {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Service.class));
        List<Method> methods = new ArrayList<>();
        for (var candidate : scanner.findCandidateComponents("com.vju.club")) {
            for (Method method : Class.forName(candidate.getBeanClassName()).getDeclaredMethods()) {
                if (method.isAnnotationPresent(RequirePermission.class)) methods.add(method);
            }
        }
        return methods;
    }

    @Test
    void annotationsPointAtRealParameters() throws Exception {
        List<Method> methods = annotatedMethods();
        assertThat(methods).hasSizeGreaterThanOrEqualTo(19);
        for (Method method : methods) {
            RequirePermission required = method.getAnnotation(RequirePermission.class);
            Parameter[] parameters = method.getParameters();
            String where = method.getDeclaringClass().getSimpleName() + "." + method.getName();
            assertThat(parameters).as(where + " compiled with -parameters").allMatch(Parameter::isNamePresent);
            assertThat(parameters).as(where + " takes an Actor").anyMatch(p -> p.getType() == Actor.class);
            assertThat(required.value()).as(where).matches("[a-z]+(\\.[a-z_]+)+");
            for (String name : List.of(required.clubId(), required.departmentId())) {
                if (name.isEmpty()) continue;
                assertThat(Arrays.stream(parameters).filter(p -> p.getName().equals(name) && p.getType() == UUID.class))
                        .as(where + " has UUID parameter " + name).hasSize(1);
            }
        }
    }
}
