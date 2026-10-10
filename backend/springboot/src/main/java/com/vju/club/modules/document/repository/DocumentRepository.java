package com.vju.club.modules.document.repository;

import com.vju.club.modules.document.entity.Document;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID>, JpaSpecificationExecutor<Document> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Document d WHERE d.id = :id")
    Optional<Document> findForUpdate(@Param("id") UUID id);

    @Query("SELECT count(d) > 0 FROM Document d WHERE d.club.id = :clubId AND d.deleted = false "
            + "AND lower(d.name) = lower(:name) AND (:exceptId IS NULL OR d.id <> :exceptId)")
    boolean existsLiveName(@Param("clubId") UUID clubId, @Param("name") String name, @Param("exceptId") UUID exceptId);

    @Query("SELECT d.name FROM Document d WHERE d.club.id = :clubId AND d.deleted = :deleted ORDER BY lower(d.name), d.id")
    List<String> findNames(@Param("clubId") UUID clubId, @Param("deleted") boolean deleted);
}
