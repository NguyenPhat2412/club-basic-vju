package com.vju.club.repository;

import com.vju.club.entity.Club;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ClubRepository extends JpaRepository<Club, UUID> {
    @Query("SELECT count(c) > 0 FROM Club c WHERE lower(c.code) = lower(:code)")
    boolean existsByCodeIgnoreCase(@Param("code") String code);
}
