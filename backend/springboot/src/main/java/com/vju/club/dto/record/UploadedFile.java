package com.vju.club.dto.record;

import com.vju.club.service.DocumentFileInspector;

public record UploadedFile(String originalName, DocumentFileInspector.ContentSource content) { }
