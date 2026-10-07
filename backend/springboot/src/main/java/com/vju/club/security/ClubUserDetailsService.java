package com.vju.club.security;

import com.vju.club.modules.user.entity.UserStatus;

import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ClubUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public ClubUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return toUserDetails(user);
    }

    public UserDetails loadUserById(User user) {
        return toUserDetails(user);
    }

    private UserDetails toUserDetails(User user) {
        return org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .disabled(user.getStatus() != com.vju.club.modules.user.entity.UserStatus.ACTIVE)
                .authorities(List.of())
                .build();
    }
}
