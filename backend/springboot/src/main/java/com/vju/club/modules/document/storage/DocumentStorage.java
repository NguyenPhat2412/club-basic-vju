package com.vju.club.modules.document.storage;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.Optional;

public interface DocumentStorage {
    void put(String key, InputStream content, long size, String contentType);

    StoredObject open(String key);

    void delete(String key);

    Optional<URI> presignDownload(String key, String fileName, String contentType, Duration ttl);

    record StoredObject(InputStream content, long size) { }
}
