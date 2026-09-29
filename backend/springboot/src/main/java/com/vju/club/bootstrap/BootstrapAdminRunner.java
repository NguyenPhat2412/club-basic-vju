package com.vju.club.bootstrap;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("local")
public class BootstrapAdminRunner implements CommandLineRunner {

    private final BootstrapAdminService bootstrapAdminService;

    public BootstrapAdminRunner(BootstrapAdminService bootstrapAdminService) {
        this.bootstrapAdminService = bootstrapAdminService;
    }

    @Override
    public void run(String... args) {
        bootstrapAdminService.bootstrap();
    }
}
