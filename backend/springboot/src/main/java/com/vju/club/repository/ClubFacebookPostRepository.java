package com.vju.club.repository;

import com.vju.club.entity.ClubFacebookPost;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClubFacebookPostRepository extends JpaRepository<ClubFacebookPost, UUID> {
    List<ClubFacebookPost> findByClub_IdOrderByPublishedAtDesc(UUID clubId, Pageable pageable);
    List<ClubFacebookPost> findByClub_IdOrderByPublishedAtDesc(UUID clubId);
    Optional<ClubFacebookPost> findByClub_IdAndFbPostId(UUID clubId, String fbPostId);
    void deleteByClub_Id(UUID clubId);
}
