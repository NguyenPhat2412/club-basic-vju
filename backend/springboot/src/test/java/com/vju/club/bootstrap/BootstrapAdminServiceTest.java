package com.vju.club.bootstrap;

import com.vju.club.config.BootstrapAdminProperties;
import com.vju.club.entity.Permission;
import com.vju.club.entity.PermissionScope;
import com.vju.club.entity.User;
import com.vju.club.entity.UserPermission;
import com.vju.club.repository.PermissionRepository;
import com.vju.club.repository.UserPermissionRepository;
import com.vju.club.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BootstrapAdminServiceTest {

    @Mock UserRepository userRepository;
    @Mock PermissionRepository permissionRepository;
    @Mock UserPermissionRepository userPermissionRepository;

    private BootstrapAdminService service(String email, String password) {
        BootstrapAdminProperties properties = new BootstrapAdminProperties();
        properties.setEmail(email);
        properties.setPassword(password);
        return new BootstrapAdminService(properties, userRepository, permissionRepository,
                userPermissionRepository, new BCryptPasswordEncoder(4));
    }

    private static Permission permission() {
        Permission permission = new Permission();
        permission.setId(UUID.randomUUID());
        return permission;
    }

    @Test
    void doesNothingWhenNotConfigured() {
        service("", "").bootstrap();
        service("admin@local", null).bootstrap();
        verifyNoInteractions(userRepository, permissionRepository, userPermissionRepository);
    }

    @Test
    void createsAdminWithLowercaseEmailAndGrantsEveryActivePermissionGlobally() {
        when(userRepository.findByEmailIgnoreCase("admin@local")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });
        when(permissionRepository.findAllByActiveTrueOrderByModuleAscActionAsc()).thenReturn(List.of(permission(), permission()));

        service(" ADMIN@local ", "secret-password").bootstrap();

        ArgumentCaptor<User> user = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(user.capture());
        assertThat(user.getValue().getEmail()).isEqualTo("admin@local");
        ArgumentCaptor<UserPermission> grants = ArgumentCaptor.forClass(UserPermission.class);
        verify(userPermissionRepository, times(2)).save(grants.capture());
        assertThat(grants.getAllValues()).allSatisfy(grant -> {
            assertThat(grant.getScope()).isEqualTo(PermissionScope.GLOBAL);
            assertThat(grant.getUser()).isSameAs(user.getValue());
        });
    }

    @Test
    void isIdempotentForExistingAdminAndGrants() {
        User admin = new User();
        admin.setId(UUID.randomUUID());
        Permission permission = permission();
        UserPermission existing = new UserPermission();
        existing.setScope(PermissionScope.GLOBAL);
        when(userRepository.findByEmailIgnoreCase("admin@local")).thenReturn(Optional.of(admin));
        when(permissionRepository.findAllByActiveTrueOrderByModuleAscActionAsc()).thenReturn(List.of(permission));
        when(userPermissionRepository.findByUser_IdAndPermission_IdAndRevokedAtIsNullOrderByGrantedAtDesc(admin.getId(), permission.getId()))
                .thenReturn(List.of(existing));

        service("admin@local", "secret-password").bootstrap();

        verify(userRepository, never()).save(any());
        verify(userPermissionRepository, never()).save(any());
    }
}
