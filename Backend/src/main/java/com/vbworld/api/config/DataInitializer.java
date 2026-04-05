package com.vbworld.api.config;

import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
    	userRepository.findByEmail("admin@vbworld.in")
        .ifPresentOrElse(
            user -> log.info("Admin already exists"),
            () -> {
                UserEntity admin = UserEntity.builder()
                    .name("VB Admin")
                    .email("admin@vbworld.in")
                    .passwordHash(passwordEncoder.encode("password"))
                    .role(UserEntity.Role.ADMIN)
                    .active(true)
                    .status(UserEntity.Status.APPROVED) // 🔥 IMPORTANT
                    .build();

                userRepository.save(admin);
                log.info("✅ Default admin created");
            }
        );
    }
}