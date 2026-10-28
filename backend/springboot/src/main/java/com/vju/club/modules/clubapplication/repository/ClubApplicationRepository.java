package com.vju.club.modules.clubapplication.repository;

import java.time.OffsetDateTime;
import org.springframework.data.jpa.repository.Modifying;
import com.vju.club.modules.clubapplication.entity.ClubApplication;
import com.vju.club.modules.clubapplication.enums.ClubApplicationStatus;
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

import java.util.Optional;
import java.util.UUID;

public interface ClubApplicationRepository extends JpaRepository<ClubApplication, UUID>, JpaSpecificationExecutor<ClubApplication> {
    @Override
    @EntityGraph(attributePaths = {"applicant", "club", "reviewedBy", "preferredDepartment", "secondaryDepartment"})
    Page<ClubApplication> findAll(Specification<ClubApplication> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"applicant", "club", "reviewedBy", "preferredDepartment", "secondaryDepartment"})
    Optional<ClubApplication> findByIdAndApplicant_Id(UUID id, UUID applicantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM ClubApplication a JOIN FETCH a.applicant JOIN FETCH a.club LEFT JOIN FETCH a.reviewedBy "
            + "LEFT JOIN FETCH a.preferredDepartment LEFT JOIN FETCH a.secondaryDepartment "
            + "WHERE a.id = :id AND a.applicant.id = :applicantId")
    Optional<ClubApplication> findForUpdateByIdAndApplicant_Id(@Param("id") UUID id,
                                                                @Param("applicantId") UUID applicantId);

    @EntityGraph(attributePaths = {"applicant", "club", "reviewedBy", "preferredDepartment", "secondaryDepartment"})
    Optional<ClubApplication> findByIdAndClub_Id(UUID id, UUID clubId);

    long countByApplicant_IdAndStatus(UUID applicantId, ClubApplicationStatus status);

    Optional<ClubApplication> findFirstByApplicant_IdAndClub_IdAndStatusOrderByReviewedAtDesc(
            UUID applicantId, UUID clubId, ClubApplicationStatus status);

    Optional<ClubApplication> findByApplicant_IdAndClub_IdAndStatus(
            UUID applicantId, UUID clubId, ClubApplicationStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM ClubApplication a JOIN FETCH a.applicant JOIN FETCH a.club LEFT JOIN FETCH a.reviewedBy "
            + "LEFT JOIN FETCH a.preferredDepartment LEFT JOIN FETCH a.secondaryDepartment "
            + "WHERE a.id = :id AND a.club.id = :clubId")
    Optional<ClubApplication> findForReview(@Param("id") UUID id, @Param("clubId") UUID clubId);

    @Modifying(flushAutomatically = true)
    @Query(value = "UPDATE club_applications SET status = 'REJECTED', reviewed_by = :actorId, reviewed_at = :now, "
            + "review_note = :note, updated_at = :now WHERE club_id = :clubId AND status = 'PENDING'", nativeQuery = true)
    int rejectPendingForClub(@Param("clubId") UUID clubId, @Param("actorId") UUID actorId,
                             @Param("now") OffsetDateTime now, @Param("note") String note);
}
