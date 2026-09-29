package com.vju.club.department;

import com.vju.club.entity.Department;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class DepartmentDaoImpl implements DepartmentDao {
    private final EntityManager entityManager;

    public DepartmentDaoImpl(EntityManager entityManager) { this.entityManager = entityManager; }

    @Override
    public List<Department> findByClub(UUID clubId, int offset, int limit) {
        TypedQuery<Department> query = entityManager.createQuery(
                "SELECT d FROM Department d WHERE d.club.id = :clubId ORDER BY d.name ASC", Department.class);
        query.setParameter("clubId", clubId);
        query.setFirstResult(Math.max(0, offset));
        query.setMaxResults(Math.max(1, Math.min(limit, 100)));
        return query.getResultList();
    }
}
