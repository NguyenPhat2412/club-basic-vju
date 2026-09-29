package com.vju.club.membership;

import com.vju.club.entity.Membership;

import java.util.List;
import java.util.UUID;

public interface MembershipDao {
    List<Membership> findByClub(UUID clubId, int offset, int limit);
}
