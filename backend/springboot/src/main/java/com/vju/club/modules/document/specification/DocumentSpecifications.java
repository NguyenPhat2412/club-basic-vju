package com.vju.club.modules.document.specification;

import com.vju.club.modules.document.entity.Document;
import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;
import java.util.UUID;

public final class DocumentSpecifications {
    private DocumentSpecifications() {
    }

    public static Specification<Document> inClub(UUID clubId) {
        return (root, query, cb) -> cb.equal(root.get("club").get("id"), clubId);
    }

    public static Specification<Document> deleted(boolean deleted) {
        return (root, query, cb) -> cb.equal(root.get("deleted"), deleted);
    }

    public static Specification<Document> nameContains(String text) {
        return (root, query, cb) -> {
            if (text == null || text.isBlank()) return null;
            String escaped = text.strip().toLowerCase(Locale.ROOT)
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
            return cb.like(cb.lower(root.get("name")), "%" + escaped + "%", '\\');
        };
    }

    public static Specification<Document> appDetailKey(String key) {
        return (root, query, cb) -> key == null ? null : cb.equal(root.get("appDetailKey"), key);
    }
}
