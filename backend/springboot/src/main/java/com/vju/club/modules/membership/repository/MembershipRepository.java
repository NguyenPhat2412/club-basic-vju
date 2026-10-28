package com.vju.club.modules.membership.repository;

import com.vju.club.modules.membership.entity.Membership;
import com.vju.club.modules.membership.enums.MembershipStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembershipRepository extends JpaRepository<Membership, UUID>, JpaSpecificationExecutor<Membership> {
    @Override
    @EntityGraph(attributePaths = {"user", "club"})
    Page<Membership> findAll(Specification<Membership> spec, Pageable pageable);

    Optional<Membership> findFirstByUser_IdAndClub_IdAndStatusNot(UUID userId, UUID clubId, MembershipStatus status);

    boolean existsByUser_IdAndClub_IdAndStatus(UUID userId, UUID clubId, MembershipStatus status);

    @Query("SELECT m.user.id FROM Membership m WHERE m.club.id = :clubId AND m.status = com.vju.club.modules.membership.enums.MembershipStatus.ACTIVE")
    List<UUID> findActiveUserIdsByClubId(@Param("clubId") UUID clubId);

    @Query("SELECT m.club.id FROM Membership m WHERE m.user.id = :userId AND m.status = com.vju.club.modules.membership.enums.MembershipStatus.ACTIVE")
    List<UUID> findActiveClubIdsByUserId(@Param("userId") UUID userId);

    long countByUser_IdAndStatusNot(UUID userId, MembershipStatus status);
}
