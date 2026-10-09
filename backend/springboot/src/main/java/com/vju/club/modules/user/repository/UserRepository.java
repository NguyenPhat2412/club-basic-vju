package com.vju.club.modules.user.repository;

import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {
    // lower(...) matches the case-insensitive unique indexes from V3, so these lookups use an index.
    @Query("SELECT u FROM User u WHERE lower(u.email) = lower(:email)")
    Optional<User> findByEmailIgnoreCase(@Param("email") String email);

    @Query("SELECT count(u) > 0 FROM User u WHERE lower(u.email) = lower(:email)")
    boolean existsByEmailIgnoreCase(@Param("email") String email);

    @Query("SELECT count(u) > 0 FROM User u WHERE lower(u.studentCode) = lower(:studentCode)")
    boolean existsByStudentCodeIgnoreCase(@Param("studentCode") String studentCode);

    boolean existsByIdAndStatus(UUID id, UserStatus status);
}
