package com.vju.club.dto.response;

public record ApiCatalogEntry(
        String method,
        String path,
        String module,
        String backend,
        String status,
        boolean authRequired,
        String permission
) {
}

