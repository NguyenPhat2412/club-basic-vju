package com.vju.club.modules.document.storage;

import com.vju.club.modules.document.exception.DocumentStorageException;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.Optional;

public class LocalDocumentStorage implements DocumentStorage {
    private final Path root;

    public LocalDocumentStorage(Path root) {
        this.root = root.toAbsolutePath().normalize();
    }

    @Override
    public void put(String key, InputStream content, long size, String contentType) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(content, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new DocumentStorageException("Could not store the file", exception);
        }
    }

    @Override
    public StoredObject open(String key) {
        Path file = resolve(key);
        try {
            return new StoredObject(Files.newInputStream(file), Files.size(file));
        } catch (NoSuchFileException exception) {
            throw new DocumentStorageException("Stored file is missing", exception);
        } catch (IOException exception) {
            throw new DocumentStorageException("Could not read the stored file", exception);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException exception) {
            throw new DocumentStorageException("Could not delete the stored file", exception);
        }
    }

    @Override
    public Optional<URI> presignDownload(String key, String fileName, String contentType, Duration ttl) {
        return Optional.empty();
    }

    private Path resolve(String key) {
        Path path = root.resolve(key).normalize();
        if (!path.startsWith(root) || path.equals(root)) {
            throw new IllegalArgumentException("Object key escapes the storage root: " + key);
        }
        return path;
    }
}
