package com.vju.club.repository;

import com.vju.club.entity.Club;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ClubRepository extends JpaRepository<Club, UUID> {
    boolean existsByCodeIgnoreCase(String code);
}
