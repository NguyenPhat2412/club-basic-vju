package com.vju.club.rest;

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
