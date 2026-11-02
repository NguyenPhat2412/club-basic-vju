package com.vju.club.service;

import com.vju.club.dto.response.ApiCatalogEntry;

import java.util.List;

public interface ApiCatalogService {
    List<ApiCatalogEntry> entries();
}

