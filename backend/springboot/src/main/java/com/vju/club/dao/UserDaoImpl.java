package com.vju.club.dao;

import com.vju.club.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import com.vju.club.error.ApiException;
import org.springframework.http.HttpStatus;

@Repository
public class UserDaoImpl implements UserDao {

    private static final Map<String, String> SORT_COLUMNS = Map.of(
            "email", "u.email",
            "fullName", "u.fullName",
            "createdAt", "u.createdAt",
            "status", "u.status"
    );

    private final EntityManager entityManager;

    public UserDaoImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public List<User> search(String query, int offset, int limit, String orderBy, String orderType) {
        String normalized = query == null ? "" : query.trim().toLowerCase();
        String sort = SORT_COLUMNS.get(orderBy);
        if (sort == null || !("asc".equalsIgnoreCase(orderType) || "desc".equalsIgnoreCase(orderType))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT", "Unsupported sort field or direction");
        }
        String direction = "asc".equalsIgnoreCase(orderType) ? "ASC" : "DESC";
        TypedQuery<User> typedQuery = entityManager.createQuery(
                "SELECT u FROM User u "
                        + "WHERE LOWER(u.email) LIKE :query "
                        + "OR LOWER(u.fullName) LIKE :query "
                        + "OR LOWER(COALESCE(u.studentCode, '')) LIKE :query "
                        + "ORDER BY " + sort + " " + direction,
                User.class);
        typedQuery.setParameter("query", "%" + normalized + "%");
        typedQuery.setFirstResult(Math.max(0, offset));
        typedQuery.setMaxResults(Math.max(1, Math.min(limit, 100)));
        return typedQuery.getResultList();
    }

    @Override
    public long count(String query) {
        String normalized = query == null ? "" : query.trim().toLowerCase();
        return entityManager.createQuery(
                        "SELECT COUNT(u) FROM User u "
                                + "WHERE LOWER(u.email) LIKE :query "
                                + "OR LOWER(u.fullName) LIKE :query "
                                + "OR LOWER(COALESCE(u.studentCode, '')) LIKE :query",
                        Long.class)
                .setParameter("query", "%" + normalized + "%")
                .getSingleResult();
    }
}
