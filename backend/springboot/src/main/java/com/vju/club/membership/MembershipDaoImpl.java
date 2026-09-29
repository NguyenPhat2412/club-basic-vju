package com.vju.club.membership;

import com.vju.club.entity.Membership;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class MembershipDaoImpl implements MembershipDao {
    private final EntityManager entityManager;
    public MembershipDaoImpl(EntityManager entityManager) { this.entityManager = entityManager; }

    @Override
    public List<Membership> findByClub(UUID clubId, int offset, int limit) {
        TypedQuery<Membership> query = entityManager.createQuery(
                "SELECT m FROM Membership m WHERE m.club.id = :clubId ORDER BY m.joinedAt DESC", Membership.class);
        query.setParameter("clubId", clubId);
        query.setFirstResult(Math.max(0, offset));
        query.setMaxResults(Math.max(1, Math.min(limit, 100)));
        return query.getResultList();
    }
}
