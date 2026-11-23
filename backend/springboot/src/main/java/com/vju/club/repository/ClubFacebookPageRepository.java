package com.vju.club.repository;

import com.vju.club.entity.ClubFacebookPage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ClubFacebookPageRepository extends JpaRepository<ClubFacebookPage, UUID> {
    Optional<ClubFacebookPage> findByClub_Id(UUID clubId);
    void deleteByClub_Id(UUID clubId);
}
