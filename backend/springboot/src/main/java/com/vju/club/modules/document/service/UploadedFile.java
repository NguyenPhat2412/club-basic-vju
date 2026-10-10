package com.vju.club.modules.document.service;

public record UploadedFile(String originalName, DocumentFileInspector.ContentSource content) { }
