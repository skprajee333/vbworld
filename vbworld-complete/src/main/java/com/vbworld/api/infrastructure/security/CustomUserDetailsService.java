package com.vbworld.api.infrastructure.security;

import com.vbworld.api.infrastructure.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) {

        var user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found: " + email));

        // 🔥 BLOCK LOGIN HERE
        if (!user.isActive()) {
            throw new UsernameNotFoundException("User is inactive");
        }

        if (user.getStatus() != com.vbworld.api.infrastructure.entity.UserEntity.Status.APPROVED) {
            throw new UsernameNotFoundException("User not approved yet");
        }

        return user;
    }
}