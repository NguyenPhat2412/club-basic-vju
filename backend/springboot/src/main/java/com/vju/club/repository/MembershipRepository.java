package com.vju.club.repository;

import com.vju.club.entity.Membership;
import com.vju.club.entity.MembershipStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {

    /** Newest first; includes LEFT rows (the history) unless a status filter is given. */
    @Query("SELECT m FROM Membership m WHERE m.club.id = :clubId AND (:status IS NULL OR m.status = :status) "
            + "ORDER BY m.joinedAt DESC, m.id ASC")
    List<Membership> findPageByClub(@Param("clubId") UUID clubId, @Param("status") MembershipStatus status,
                                    Pageable pageable);

    @Query("SELECT count(m) FROM Membership m WHERE m.club.id = :clubId AND (:status IS NULL OR m.status = :status)")
    long countByClub(@Param("clubId") UUID clubId, @Param("status") MembershipStatus status);

    @Query("SELECT DISTINCT m FROM Membership m LEFT JOIN DepartmentMember dm ON dm.membership.id = m.id "
            + "WHERE m.club.id = :clubId AND (:status IS NULL OR m.status = :status) "
            + "AND (:departmentId IS NULL OR dm.department.id = :departmentId) "
            + "AND (:search IS NULL OR lower(m.user.email) LIKE :search "
            + "OR lower(m.user.fullName) LIKE :search "
            + "OR lower(coalesce(m.user.studentCode, '')) LIKE :search) "
            + "ORDER BY m.joinedAt DESC, m.id ASC")
    List<Membership> findPageByClubFiltered(@Param("clubId") UUID clubId,
                                            @Param("status") MembershipStatus status,
                                            @Param("departmentId") UUID departmentId,
                                            @Param("search") String search, Pageable pageable);

    @Query("SELECT count(DISTINCT m) FROM Membership m LEFT JOIN DepartmentMember dm ON dm.membership.id = m.id "
            + "WHERE m.club.id = :clubId AND (:status IS NULL OR m.status = :status) "
            + "AND (:departmentId IS NULL OR dm.department.id = :departmentId) "
            + "AND (:search IS NULL OR lower(m.user.email) LIKE :search "
            + "OR lower(m.user.fullName) LIKE :search "
            + "OR lower(coalesce(m.user.studentCode, '')) LIKE :search)")
    long countByClubFiltered(@Param("clubId") UUID clubId,
                             @Param("status") MembershipStatus status,
                             @Param("departmentId") UUID departmentId,
                             @Param("search") String search);

    @Query("SELECT m FROM Membership m JOIN FETCH m.club "
            + "WHERE m.user.id = :userId AND (:status IS NULL OR m.status = :status) "
            + "ORDER BY m.joinedAt DESC, m.id ASC")
    List<Membership> findPageByUser(@Param("userId") UUID userId,
                                    @Param("status") MembershipStatus status, Pageable pageable);

    @Query("SELECT count(m) FROM Membership m WHERE m.user.id = :userId "
            + "AND (:status IS NULL OR m.status = :status)")
    long countByUser(@Param("userId") UUID userId, @Param("status") MembershipStatus status);

    /** The user's current membership in the club: at most one row is not LEFT. */
    Optional<Membership> findFirstByUser_IdAndClub_IdAndStatusNot(UUID userId, UUID clubId, MembershipStatus status);
}
