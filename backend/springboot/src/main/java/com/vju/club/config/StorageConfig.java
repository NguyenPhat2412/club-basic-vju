package com.vju.club.config;

import com.vju.club.modules.document.storage.DocumentStorage;
import com.vju.club.modules.document.storage.LocalDocumentStorage;
import com.vju.club.modules.document.storage.R2DocumentStorage;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(StorageProperties.class)
public class StorageConfig {
    @Bean
    DocumentStorage documentStorage(StorageProperties properties) {
        return switch (properties.getType()) {
            case LOCAL -> new LocalDocumentStorage(properties.getLocal().getRoot());
            case R2 -> R2DocumentStorage.create(properties.getR2());
        };
    }
}
