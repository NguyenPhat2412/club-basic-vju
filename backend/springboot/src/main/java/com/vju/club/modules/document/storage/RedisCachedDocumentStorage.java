package com.vju.club.modules.document.storage;

import com.vju.club.modules.document.exception.DocumentStorageException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStringCommands;
import org.springframework.data.redis.core.types.Expiration;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;

/**
 * Wraps a {@link DocumentStorage} (such as Cloudflare R2) with a Redis binary cache
 * for images and documents up to {@code maxCachedBytes} (default 2 MB).
 */
public class RedisCachedDocumentStorage implements DocumentStorage, AutoCloseable {
    private static final Logger log = LoggerFactory.getLogger(RedisCachedDocumentStorage.class);
    private static final String KEY_PREFIX = "vju:asset:";

    private final DocumentStorage delegate;
    private final RedisConnectionFactory redisConnectionFactory;
    private final long maxCachedBytes;
    private final Duration ttl;

    public RedisCachedDocumentStorage(DocumentStorage delegate,
                                      RedisConnectionFactory redisConnectionFactory,
                                      long maxCachedBytes,
                                      Duration ttl) {
        this.delegate = delegate;
        this.redisConnectionFactory = redisConnectionFactory;
        this.maxCachedBytes = maxCachedBytes;
        this.ttl = ttl;
    }

    @Override
    public void put(String key, InputStream content, long size, String contentType) {
        if (size > 0 && size <= maxCachedBytes) {
            byte[] bytes;
            try {
                bytes = content.readAllBytes();
            } catch (IOException e) {
                throw new DocumentStorageException("Could not read stream for caching", e);
            }
            delegate.put(key, new ByteArrayInputStream(bytes), bytes.length, contentType);
            putInRedis(key, bytes);
            return;
        }
        delegate.put(key, content, size, contentType);
    }

    @Override
    public StoredObject open(String key) {
        byte[] cached = getFromRedis(key);
        if (cached != null) {
            return new StoredObject(new ByteArrayInputStream(cached), cached.length);
        }
        StoredObject stored = delegate.open(key);
        if (stored.size() > 0 && stored.size() <= maxCachedBytes) {
            try (InputStream stream = stored.content()) {
                byte[] bytes = stream.readAllBytes();
                putInRedis(key, bytes);
                return new StoredObject(new ByteArrayInputStream(bytes), bytes.length);
            } catch (IOException e) {
                throw new DocumentStorageException("Could not read stored object stream", e);
            }
        }
        return stored;
    }

    @Override
    public void delete(String key) {
        delegate.delete(key);
        evictFromRedis(key);
    }

    @Override
    public Optional<URI> presignDownload(String key, String fileName, String contentType, Duration ttl) {
        return delegate.presignDownload(key, fileName, contentType, ttl);
    }

    @Override
    public void close() throws Exception {
        if (delegate instanceof AutoCloseable closeable) {
            closeable.close();
        }
    }

    private byte[] redisKey(String key) {
        return (KEY_PREFIX + key).getBytes(StandardCharsets.UTF_8);
    }

    private byte[] getFromRedis(String key) {
        try (RedisConnection connection = redisConnectionFactory.getConnection()) {
            return connection.stringCommands().get(redisKey(key));
        } catch (RuntimeException e) {
            log.warn("Redis asset cache GET failed for {}: {}", key, e.getMessage());
            return null;
        }
    }

    private void putInRedis(String key, byte[] bytes) {
        try (RedisConnection connection = redisConnectionFactory.getConnection()) {
            connection.stringCommands().set(
                    redisKey(key),
                    bytes,
                    Expiration.from(ttl),
                    RedisStringCommands.SetOption.UPSERT
            );
        } catch (RuntimeException e) {
            log.warn("Redis asset cache PUT failed for {}: {}", key, e.getMessage());
        }
    }

    private void evictFromRedis(String key) {
        try (RedisConnection connection = redisConnectionFactory.getConnection()) {
            connection.keyCommands().del(redisKey(key));
        } catch (RuntimeException e) {
            log.warn("Redis asset cache DEL failed for {}: {}", key, e.getMessage());
        }
    }
}
