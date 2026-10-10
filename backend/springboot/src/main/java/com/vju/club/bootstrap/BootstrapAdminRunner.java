package com.vju.club.bootstrap;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile({"local", "prod"})
@RequiredArgsConstructor
public class BootstrapAdminRunner implements CommandLineRunner {
    private final BootstrapAdminService bootstrapAdminService;
    private final ObjectProvider<DemoDataSeeder> demoDataSeeder;

    @Override
    public void run(String... args) {
        bootstrapAdminService.bootstrap();
        demoDataSeeder.ifAvailable(DemoDataSeeder::seed);
    }
}
