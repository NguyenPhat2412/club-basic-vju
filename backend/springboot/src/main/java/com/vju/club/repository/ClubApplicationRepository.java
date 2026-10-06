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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM ClubApplication a JOIN FETCH a.applicant JOIN FETCH a.club "
            + "WHERE a.id = :id AND a.club.id = :clubId")
    Optional<ClubApplication> findForReview(@Param("id") UUID id, @Param("clubId") UUID clubId);
}
