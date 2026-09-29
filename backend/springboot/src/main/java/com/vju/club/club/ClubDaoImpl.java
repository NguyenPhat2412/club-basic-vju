package com.vju.club.club;

import com.vju.club.entity.Club;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class ClubDaoImpl implements ClubDao {

    private final EntityManager entityManager;

    public ClubDaoImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public List<Club> search(String query, int offset, int limit) {
        String normalized = query == null ? "" : query.trim().toLowerCase();
        TypedQuery<Club> typedQuery = entityManager.createQuery(
                "SELECT c FROM Club c WHERE LOWER(c.name) LIKE :query "
                        + "OR LOWER(c.code) LIKE :query ORDER BY c.name ASC", Club.class);
        typedQuery.setParameter("query", "%" + normalized + "%");
        typedQuery.setFirstResult(Math.max(0, offset));
        typedQuery.setMaxResults(Math.max(1, Math.min(limit, 100)));
        return typedQuery.getResultList();
    }

    @Override
    public long count(String query) {
        String normalized = query == null ? "" : query.trim().toLowerCase();
        return entityManager.createQuery("SELECT COUNT(c) FROM Club c WHERE LOWER(c.name) LIKE :query OR LOWER(c.code) LIKE :query", Long.class)
                .setParameter("query", "%" + normalized + "%").getSingleResult();
    }

    @Override
    public List<Club> searchForUser(UUID userId, String query, int offset, int limit) {
        String normalized = query == null ? "" : query.trim().toLowerCase();
        TypedQuery<Club> typedQuery = entityManager.createQuery(
                "SELECT c FROM Club c WHERE (LOWER(c.name) LIKE :query OR LOWER(c.code) LIKE :query) "
                        + "AND EXISTS (SELECT up.id FROM UserPermission up WHERE up.user.id = :userId "
                        + "AND up.permission.permissionKey = 'club.view' AND up.permission.active = true "
                        + "AND up.revokedAt IS NULL AND (up.scope = com.vju.club.entity.PermissionScope.GLOBAL "
                        + "OR (up.scope = com.vju.club.entity.PermissionScope.CLUB AND up.club.id = c.id))) "
                        + "ORDER BY c.name ASC", Club.class);
        typedQuery.setParameter("query", "%" + normalized + "%");
        typedQuery.setParameter("userId", userId);
        typedQuery.setFirstResult(Math.max(0, offset));
        typedQuery.setMaxResults(Math.max(1, Math.min(limit, 100)));
        return typedQuery.getResultList();
    }

    @Override
    public long countForUser(UUID userId, String query) {
        String normalized = query == null ? "" : query.trim().toLowerCase();
        return entityManager.createQuery(
                        "SELECT COUNT(c) FROM Club c WHERE (LOWER(c.name) LIKE :query OR LOWER(c.code) LIKE :query) "
                                + "AND EXISTS (SELECT up.id FROM UserPermission up WHERE up.user.id = :userId "
                                + "AND up.permission.permissionKey = 'club.view' AND up.permission.active = true "
                                + "AND up.revokedAt IS NULL AND (up.scope = com.vju.club.entity.PermissionScope.GLOBAL "
                                + "OR (up.scope = com.vju.club.entity.PermissionScope.CLUB AND up.club.id = c.id)))",
                        Long.class)
                .setParameter("query", "%" + normalized + "%")
                .setParameter("userId", userId)
                .getSingleResult();
    }
}
