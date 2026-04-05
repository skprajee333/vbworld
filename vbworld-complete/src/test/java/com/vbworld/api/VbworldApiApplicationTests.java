package com.vbworld.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("dev")
class VbworldApiApplicationTests {

    @Test
    void contextLoads() {
        // Verifies Spring context starts successfully
        // with all beans wired correctly
    }
}
