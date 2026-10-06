package com.vju.club.modules.user.repository;

import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.entity.UserStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    // lower(...) matches the case-insensitive unique indexes from V3, so these lookups use an index.
    @Query("SELECT u FROM User u WHERE lower(u.email) = lower(:email)")
    Optional<User> findByEmailIgnoreCase(@Param("email") String email);

    @Query("SELECT count(u) > 0 FROM User u WHERE lower(u.email) = lower(:email)")
    boolean existsByEmailIgnoreCase(@Param("email") String email);

    String SEARCH = "FROM User u WHERE lower(u.email) LIKE :pattern OR lower(u.fullName) LIKE :pattern "
            + "OR lower(coalesce(u.studentCode, '')) LIKE :pattern";

    /** {@code pattern} is a lower-case LIKE pattern; ordering comes from the pageable's sort. */
    @Query("SELECT u " + SEARCH)
    List<User> search(@Param("pattern") String pattern, Pageable pageable);

    @Query("SELECT count(u) " + SEARCH)
    long countSearch(@Param("pattern") String pattern);

    @Query("SELECT count(u) > 0 FROM User u WHERE lower(u.studentCode) = lower(:studentCode)")
    boolean existsByStudentCodeIgnoreCase(@Param("studentCode") String studentCode);

    boolean existsByIdAndStatus(UUID id, UserStatus status);
}
