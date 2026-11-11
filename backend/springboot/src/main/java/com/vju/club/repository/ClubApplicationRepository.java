package com.vju.club.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import com.vju.club.entity.ClubApplication;
import com.vju.club.enums.ClubApplicationStatus;
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

    interface StatusCount {
        ClubApplicationStatus getStatus();

        long getTotal();
    }

    @Query("SELECT a.status AS status, COUNT(a) AS total FROM ClubApplication a GROUP BY a.status")
    List<StatusCount> countByStatus();

    @Query("SELECT a.status AS status, COUNT(a) AS total FROM ClubApplication a WHERE a.club.id IN :clubIds GROUP BY a.status")
    List<StatusCount> countByStatusForClubs(@Param("clubIds") java.util.Collection<UUID> clubIds);

    Optional<ClubApplication> findFirstByApplicant_IdAndClub_IdAndStatusOrderByReviewedAtDesc(
            UUID applicantId, UUID clubId, ClubApplicationStatus status);

    Optional<ClubApplication> findByApplicant_IdAndClub_IdAndStatus(
            UUID applicantId, UUID clubId, ClubApplicationStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM ClubApplication a JOIN FETCH a.applicant JOIN FETCH a.club "
            + "WHERE a.applicant.id = :applicantId AND a.club.id = :clubId "
            + "AND a.status = com.vju.club.enums.ClubApplicationStatus.PENDING")
    Optional<ClubApplication> findForUpdatePending(@Param("applicantId") UUID applicantId,
                                                   @Param("clubId") UUID clubId);

    @EntityGraph(attributePaths = {"applicant"})
    List<ClubApplication> findByClub_IdAndStatus(UUID clubId, ClubApplicationStatus status);

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
