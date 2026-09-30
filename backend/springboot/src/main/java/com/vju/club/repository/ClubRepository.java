package com.vju.club.repository;

import com.vju.club.entity.Club;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ClubRepository extends JpaRepository<Club, UUID> {

    @Query("SELECT count(c) > 0 FROM Club c WHERE lower(c.code) = lower(:code)")
    boolean existsByCodeIgnoreCase(@Param("code") String code);

    /** {@code pattern} is a lower-case LIKE pattern, e.g. {@code %music%}. */
    @Query("SELECT c FROM Club c WHERE lower(c.name) LIKE :pattern OR lower(c.code) LIKE :pattern "
            + "ORDER BY c.name ASC, c.id ASC")
    List<Club> search(@Param("pattern") String pattern, Pageable pageable);

    @Query("SELECT count(c) FROM Club c WHERE lower(c.name) LIKE :pattern OR lower(c.code) LIKE :pattern")
    long countSearch(@Param("pattern") String pattern);

    String VISIBLE_TO_USER = "FROM clubs c WHERE (lower(c.name) LIKE :pattern OR lower(c.code) LIKE :pattern) "
            + "AND EXISTS (SELECT 1 FROM effective_user_permissions e WHERE e.user_id = :userId "
            + "AND e.permission_key = 'club.view' "
            + "AND (e.scope = 'GLOBAL' OR (e.scope = 'CLUB' AND e.club_id = c.id)))";

    /** Clubs the user may view through a direct grant or a role. */
    @Query(value = "SELECT c.* " + VISIBLE_TO_USER + " ORDER BY c.name ASC, c.id ASC", nativeQuery = true)
    List<Club> searchVisibleTo(@Param("userId") UUID userId, @Param("pattern") String pattern, Pageable pageable);

    @Query(value = "SELECT count(*) " + VISIBLE_TO_USER, nativeQuery = true)
    long countVisibleTo(@Param("userId") UUID userId, @Param("pattern") String pattern);
}
