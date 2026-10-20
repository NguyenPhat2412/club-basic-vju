package com.vju.club.modules.document.dto.record;

import com.vju.club.modules.document.service.DocumentFileInspector;

public record UploadedFile(String originalName, DocumentFileInspector.ContentSource content) { }
