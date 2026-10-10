package com.vju.club.bootstrap;

import lombok.RequiredArgsConstructor;
import com.vju.club.config.BootstrapAdminProperties;
import com.vju.club.modules.permission.enums.PermissionScope;
import com.vju.club.modules.role.entity.Role;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.role.entity.UserRole;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.modules.role.repository.RoleRepository;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.modules.role.repository.UserRoleRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
@Profile({"local", "prod"})
@RequiredArgsConstructor
public class BootstrapAdminService {
    static final String ADMIN_ROLE = "SYSTEM_ADMIN";

    private final BootstrapAdminProperties properties;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void bootstrap() {
        if (!properties.isConfigured()) return;
        String email = properties.getEmail().trim().toLowerCase();
        User admin = userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
            User user = new User();
            user.setEmail(email);
            user.setPasswordHash(passwordEncoder.encode(properties.getPassword()));
            user.setFullName("Local Administrator");
            user.setStatus(UserStatus.ACTIVE);
            return userRepository.save(user);
        });

        Role role = roleRepository.findByCode(ADMIN_ROLE)
                .orElseThrow(() -> new IllegalStateException("Role " + ADMIN_ROLE + " is missing; check migrations"));
        if (userRoleRepository.existsByUser_IdAndRole_IdAndScopeAndRevokedAtIsNull(
                admin.getId(), role.getId(), PermissionScope.GLOBAL)) {
            return;
        }
        UserRole assignment = new UserRole();
        assignment.setUser(admin);
        assignment.setRole(role);
        assignment.setScope(PermissionScope.GLOBAL);
        assignment.setGrantedBy(admin);
        assignment.setGrantedAt(OffsetDateTime.now(ZoneOffset.UTC));
        userRoleRepository.save(assignment);
    }
}
