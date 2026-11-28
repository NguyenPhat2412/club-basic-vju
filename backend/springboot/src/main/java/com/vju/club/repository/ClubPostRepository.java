package com.vju.club.repository;

import com.vju.club.entity.ClubPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ClubPostRepository extends JpaRepository<ClubPost, UUID> {
    Page<ClubPost> findByClubIdOrderByPinnedDescCreatedAtDesc(UUID clubId, Pageable pageable);

    Optional<ClubPost> findByIdAndClubId(UUID id, UUID clubId);
}
