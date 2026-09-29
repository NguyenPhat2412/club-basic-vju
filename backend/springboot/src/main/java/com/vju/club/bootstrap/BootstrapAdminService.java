package com.vju.club.bootstrap;

import com.vju.club.config.BootstrapAdminProperties;
import com.vju.club.entity.PermissionScope;
import com.vju.club.entity.User;
import com.vju.club.entity.UserPermission;
import com.vju.club.entity.UserStatus;
import com.vju.club.repository.PermissionRepository;
import com.vju.club.repository.UserPermissionRepository;
import com.vju.club.repository.UserRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
@Profile("local")
public class BootstrapAdminService {

    private final BootstrapAdminProperties properties;
    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final PasswordEncoder passwordEncoder;

    public BootstrapAdminService(
            BootstrapAdminProperties properties,
            UserRepository userRepository,
            PermissionRepository permissionRepository,
            UserPermissionRepository userPermissionRepository,
            PasswordEncoder passwordEncoder) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
        this.userPermissionRepository = userPermissionRepository;
        this.passwordEncoder = passwordEncoder;
    }

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

        permissionRepository.findAllByActiveTrueOrderByModuleAscActionAsc().forEach(permission -> {
            boolean exists = userPermissionRepository
                    .findByUser_IdAndPermission_IdAndRevokedAtIsNullOrderByGrantedAtDesc(admin.getId(), permission.getId())
                    .stream().anyMatch(grant -> grant.getScope() == PermissionScope.GLOBAL);
            if (!exists) {
                UserPermission grant = new UserPermission();
                grant.setUser(admin);
                grant.setPermission(permission);
                grant.setScope(PermissionScope.GLOBAL);
                grant.setGrantedBy(admin);
                grant.setGrantedAt(OffsetDateTime.now(ZoneOffset.UTC));
                userPermissionRepository.save(grant);
            }
        });
    }
}
