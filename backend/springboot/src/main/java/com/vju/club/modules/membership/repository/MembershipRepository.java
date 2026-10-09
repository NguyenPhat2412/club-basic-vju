package com.vju.club.modules.membership.repository;

import com.vju.club.modules.membership.entity.Membership;
import com.vju.club.modules.membership.enums.MembershipStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface MembershipRepository extends JpaRepository<Membership, UUID>, JpaSpecificationExecutor<Membership> {

    @Override
    @EntityGraph(attributePaths = {"user", "club"})
    Page<Membership> findAll(Specification<Membership> spec, Pageable pageable);

    /** The user's current membership in the club: at most one row is not LEFT. */
    Optional<Membership> findFirstByUser_IdAndClub_IdAndStatusNot(UUID userId, UUID clubId, MembershipStatus status);
}
