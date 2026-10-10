package com.vju.club.security;

import lombok.RequiredArgsConstructor;
import com.vju.club.modules.user.enums.UserStatus;

import com.vju.club.modules.user.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ClubUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    @Override
    public ClubPrincipal loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmailIgnoreCase(email)
                .map(user -> new ClubPrincipal(user.getId(), user.getEmail(), user.getPasswordHash(),
                        user.getStatus() == UserStatus.ACTIVE))
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
