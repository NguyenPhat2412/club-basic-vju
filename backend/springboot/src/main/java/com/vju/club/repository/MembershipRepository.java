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

    /** The user's current membership in the club: at most one row is not LEFT. */
    Optional<Membership> findFirstByUser_IdAndClub_IdAndStatusNot(UUID userId, UUID clubId, MembershipStatus status);
}
