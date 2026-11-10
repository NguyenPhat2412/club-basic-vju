package com.vju.club.repository;

import com.vju.club.entity.I18nTranslation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface I18nTranslationRepository extends JpaRepository<I18nTranslation, UUID> {
    List<I18nTranslation> findByTargetLocale(String targetLocale);

    List<I18nTranslation> findByTargetLocaleAndSourceHashIn(String targetLocale, Collection<String> sourceHashes);

    Optional<I18nTranslation> findBySourceHashAndTargetLocale(String sourceHash, String targetLocale);
}
