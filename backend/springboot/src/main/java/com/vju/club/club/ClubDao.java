package com.vju.club.club;

import com.vju.club.entity.Club;

import java.util.List;
import java.util.UUID;

public interface ClubDao {
    List<Club> search(String query, int offset, int limit);
    long count(String query);
    List<Club> searchForUser(UUID userId, String query, int offset, int limit);
    long countForUser(UUID userId, String query);
}
