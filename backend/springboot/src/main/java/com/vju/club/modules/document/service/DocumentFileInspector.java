package com.vju.club.modules.document.service;

import com.vju.club.modules.document.enums.DocumentFileType;

import java.io.IOException;
import java.io.InputStream;

public interface DocumentFileInspector {
    record InspectedFile(String name, DocumentFileType type, long size, String sha256) { }

    @FunctionalInterface
    interface ContentSource {
        InputStream open() throws IOException;
    }

    InspectedFile inspect(String rawName, ContentSource content);

    String checkName(String raw);

    DocumentFileType typeOf(String name);

    String checkAppDetailKey(String raw);
}
