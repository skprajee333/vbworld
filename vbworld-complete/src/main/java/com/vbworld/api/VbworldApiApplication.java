package com.vbworld.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableCaching
@EnableJpaAuditing
@EnableScheduling
public class VbworldApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(VbworldApiApplication.class, args);
    }
}
