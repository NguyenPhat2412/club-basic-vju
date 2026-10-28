package com.vju.club.modules.setting.repository;

import com.vju.club.modules.setting.entity.SystemSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface SystemSettingsRepository extends JpaRepository<SystemSettings, UUID> {
    @Query("SELECT s FROM SystemSettings s")
    Optional<SystemSettings> findSingleton();
}
