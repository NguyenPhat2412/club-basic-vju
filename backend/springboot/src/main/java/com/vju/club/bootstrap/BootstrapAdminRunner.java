package com.vju.club.bootstrap;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("local")
@RequiredArgsConstructor
public class BootstrapAdminRunner implements CommandLineRunner {
    private final BootstrapAdminService bootstrapAdminService;
    private final DemoDataSeeder demoDataSeeder;

    @Override
    public void run(String... args) {
        bootstrapAdminService.bootstrap();
        demoDataSeeder.seed();
    }
}
