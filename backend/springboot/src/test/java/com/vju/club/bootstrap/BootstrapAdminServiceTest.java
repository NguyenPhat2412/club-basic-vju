package com.vju.club.bootstrap;

import com.vju.club.config.BootstrapAdminProperties;
import com.vju.club.modules.permission.entity.PermissionScope;
import com.vju.club.modules.role.entity.Role;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.role.entity.UserRole;
import com.vju.club.modules.role.repository.RoleRepository;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.modules.role.repository.UserRoleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BootstrapAdminServiceTest {

    @Mock UserRepository userRepository;
    @Mock RoleRepository roleRepository;
    @Mock UserRoleRepository userRoleRepository;

    private BootstrapAdminService service(String email, String password) {
        BootstrapAdminProperties properties = new BootstrapAdminProperties();
        properties.setEmail(email);
        properties.setPassword(password);
        return new BootstrapAdminService(properties, userRepository, roleRepository, userRoleRepository,
                new BCryptPasswordEncoder(4));
    }

    private static Role adminRole() {
        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setCode(BootstrapAdminService.ADMIN_ROLE);
        role.setScope(PermissionScope.GLOBAL);
        return role;
    }

    @Test
    void doesNothingWhenNotConfigured() {
        service("", "").bootstrap();
        service("admin@local", null).bootstrap();
        verifyNoInteractions(userRepository, roleRepository, userRoleRepository);
    }

    @Test
    void createsAdminWithLowercaseEmailAndAssignsSystemAdminGlobally() {
        Role role = adminRole();
        when(userRepository.findByEmailIgnoreCase("admin@local")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });
        when(roleRepository.findByCode("SYSTEM_ADMIN")).thenReturn(Optional.of(role));

        service(" ADMIN@local ", "secret-password").bootstrap();

        ArgumentCaptor<User> user = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(user.capture());
        assertThat(user.getValue().getEmail()).isEqualTo("admin@local");
        ArgumentCaptor<UserRole> assignment = ArgumentCaptor.forClass(UserRole.class);
        verify(userRoleRepository).save(assignment.capture());
        assertThat(assignment.getValue().getRole()).isSameAs(role);
        assertThat(assignment.getValue().getScope()).isEqualTo(PermissionScope.GLOBAL);
        assertThat(assignment.getValue().getUser()).isSameAs(user.getValue());
    }

    @Test
    void isIdempotentForExistingAdminAndAssignment() {
        User admin = new User();
        admin.setId(UUID.randomUUID());
        Role role = adminRole();
        when(userRepository.findByEmailIgnoreCase("admin@local")).thenReturn(Optional.of(admin));
        when(roleRepository.findByCode("SYSTEM_ADMIN")).thenReturn(Optional.of(role));
        when(userRoleRepository.existsByUser_IdAndRole_IdAndScopeAndRevokedAtIsNull(admin.getId(), role.getId(),
                PermissionScope.GLOBAL)).thenReturn(true);

        service("admin@local", "secret-password").bootstrap();

        verify(userRepository, never()).save(any());
        verify(userRoleRepository, never()).save(any());
    }

    @Test
    void failsLoudlyWhenTheSystemRoleIsMissing() {
        User admin = new User();
        admin.setId(UUID.randomUUID());
        when(userRepository.findByEmailIgnoreCase("admin@local")).thenReturn(Optional.of(admin));
        when(roleRepository.findByCode("SYSTEM_ADMIN")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service("admin@local", "secret-password").bootstrap())
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("SYSTEM_ADMIN");
    }
}
