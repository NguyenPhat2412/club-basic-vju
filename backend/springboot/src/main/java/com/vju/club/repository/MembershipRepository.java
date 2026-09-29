package com.vju.club.repository;

import com.vju.club.entity.Membership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {
    List<Membership> findByClub_IdOrderByJoinedAtDesc(UUID clubId);
    boolean existsByUser_IdAndClub_Id(UUID userId, UUID clubId);
    long countByClub_Id(UUID clubId);
}
