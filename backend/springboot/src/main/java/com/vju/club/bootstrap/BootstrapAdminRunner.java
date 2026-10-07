package com.vju.club.bootstrap;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("local")
public class BootstrapAdminRunner implements CommandLineRunner {

    private final BootstrapAdminService bootstrapAdminService;
    private final DemoDataSeeder demoDataSeeder;

    public BootstrapAdminRunner(BootstrapAdminService bootstrapAdminService, DemoDataSeeder demoDataSeeder) {
        this.bootstrapAdminService = bootstrapAdminService;
        this.demoDataSeeder = demoDataSeeder;
    }

    @Override
    public void run(String... args) {
        bootstrapAdminService.bootstrap();
        demoDataSeeder.seed();
    }
}
