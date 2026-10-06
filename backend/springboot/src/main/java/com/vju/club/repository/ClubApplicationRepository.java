package com.vju.club.repository;

import com.vju.club.entity.ClubApplication;
import com.vju.club.entity.ClubApplicationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface ClubApplicationRepository extends JpaRepository<ClubApplication, UUID> {

    Optional<ClubApplication> findByIdAndApplicant_Id(UUID id, UUID applicantId);

    Optional<ClubApplication> findByIdAndClub_Id(UUID id, UUID clubId);

    Optional<ClubApplication> findByApplicant_IdAndClub_IdAndStatus(
            UUID applicantId, UUID clubId, ClubApplicationStatus status);

    @Query("SELECT a FROM ClubApplication a JOIN FETCH a.club "
            + "WHERE a.applicant.id = :applicantId "
            + "AND (:status IS NULL OR a.status = :status) "
            + "AND (:clubId IS NULL OR a.club.id = :clubId) "
            + "ORDER BY a.createdAt DESC, a.id DESC")
    List<ClubApplication> findPageByApplicant(@Param("applicantId") UUID applicantId,
                                               @Param("status") ClubApplicationStatus status,
                                               @Param("clubId") UUID clubId, Pageable pageable);

    @Query("SELECT count(a) FROM ClubApplication a "
            + "WHERE a.applicant.id = :applicantId "
            + "AND (:status IS NULL OR a.status = :status) "
            + "AND (:clubId IS NULL OR a.club.id = :clubId)")
    long countByApplicant(@Param("applicantId") UUID applicantId,
                          @Param("status") ClubApplicationStatus status,
                          @Param("clubId") UUID clubId);

    @Query("SELECT a FROM ClubApplication a JOIN FETCH a.applicant JOIN FETCH a.club "
            + "WHERE a.club.id = :clubId "
            + "AND (:status IS NULL OR a.status = :status) "
            + "AND (:search IS NULL OR lower(a.applicant.email) LIKE :search OR lower(a.applicant.fullName) LIKE :search) "
            + "AND (:createdFrom IS NULL OR a.createdAt >= :createdFrom) "
            + "AND (:createdTo IS NULL OR a.createdAt < :createdTo) "
            + "ORDER BY a.createdAt DESC, a.id DESC")
    List<ClubApplication> findPageByClub(@Param("clubId") UUID clubId,
                                         @Param("status") ClubApplicationStatus status,
                                         @Param("search") String search,
                                         @Param("createdFrom") OffsetDateTime createdFrom,
                                         @Param("createdTo") OffsetDateTime createdTo,
                                         Pageable pageable);

    @Query("SELECT count(a) FROM ClubApplication a "
            + "WHERE a.club.id = :clubId "
            + "AND (:status IS NULL OR a.status = :status) "
            + "AND (:search IS NULL OR lower(a.applicant.email) LIKE :search OR lower(a.applicant.fullName) LIKE :search) "
            + "AND (:createdFrom IS NULL OR a.createdAt >= :createdFrom) "
            + "AND (:createdTo IS NULL OR a.createdAt < :createdTo)")
    long countByClub(@Param("clubId") UUID clubId,
                     @Param("status") ClubApplicationStatus status,
                     @Param("search") String search,
                     @Param("createdFrom") OffsetDateTime createdFrom,
                     @Param("createdTo") OffsetDateTime createdTo);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM ClubApplication a JOIN FETCH a.applicant JOIN FETCH a.club "
            + "WHERE a.id = :id AND a.club.id = :clubId")
    Optional<ClubApplication> findForReview(@Param("id") UUID id, @Param("clubId") UUID clubId);
}
