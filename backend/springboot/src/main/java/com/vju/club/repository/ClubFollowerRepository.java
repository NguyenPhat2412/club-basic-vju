package com.vju.club.repository;

import com.vju.club.entity.ClubFollower;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ClubFollowerRepository extends JpaRepository<ClubFollower, ClubFollower.Key> {
    boolean existsByClubIdAndUserId(UUID clubId, UUID userId);

    void deleteByClubIdAndUserId(UUID clubId, UUID userId);

    long countByClubId(UUID clubId);
}
