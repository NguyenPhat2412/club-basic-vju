package com.vju.club.repository;

import com.vju.club.entity.Document;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID>, JpaSpecificationExecutor<Document> {
    @Override
    @EntityGraph(attributePaths = {"club", "department", "owner"})
    Page<Document> findAll(Specification<Document> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"club", "department", "owner"})
    @Query("SELECT d FROM Document d WHERE d.id = :id")
    Optional<Document> findWithRelationsById(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"club", "department", "owner"})
    @Query("SELECT d FROM Document d WHERE d.id = :id")
    Optional<Document> findForUpdate(@Param("id") UUID id);

    @Query("SELECT count(d) > 0 FROM Document d WHERE d.club.id = :clubId AND d.department IS NULL AND d.deleted = false "
            + "AND lower(d.name) = lower(:name) AND (:exceptId IS NULL OR d.id <> :exceptId)")
    boolean existsLiveName(@Param("clubId") UUID clubId, @Param("name") String name, @Param("exceptId") UUID exceptId);

    @Query("SELECT count(d) > 0 FROM Document d WHERE d.club.id = :clubId AND d.department.id = :departmentId "
            + "AND d.deleted = false AND lower(d.name) = lower(:name) AND (:exceptId IS NULL OR d.id <> :exceptId)")
    boolean existsLiveDepartmentName(@Param("clubId") UUID clubId,
                                     @Param("departmentId") UUID departmentId,
                                     @Param("name") String name,
                                     @Param("exceptId") UUID exceptId);

    @Query("SELECT count(d) > 0 FROM Document d WHERE d.scope = com.vju.club.enums.DocumentScope.SYSTEM "
            + "AND d.deleted = false AND lower(d.name) = lower(:name) AND (:exceptId IS NULL OR d.id <> :exceptId)")
    boolean existsLiveSystemName(@Param("name") String name, @Param("exceptId") UUID exceptId);

    @Query("SELECT d.name FROM Document d WHERE d.club.id = :clubId AND d.deleted = :deleted ORDER BY lower(d.name), d.id")
    List<String> findNames(@Param("clubId") UUID clubId, @Param("deleted") boolean deleted);
}
