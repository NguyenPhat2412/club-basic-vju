package com.vju.club.security;

import com.vju.club.config.FacebookProperties;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Encrypts third-party OAuth/Page access tokens at rest using AES-256-GCM before persisting to PostgreSQL.
 */
@Component
public class TokenCryptoService {
    private static final String PREFIX = "enc:v1:";
    private static final int IV_LENGTH = 12;
    private static final int TAG_BITS = 128;

    private final SecretKeySpec keySpec;
    private final SecureRandom random = new SecureRandom();

    public TokenCryptoService(FacebookProperties properties) {
        this.keySpec = deriveKey(properties.getTokenEncryptionKey());
    }

    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) {
            throw new IllegalArgumentException("Token plaintext must not be blank");
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            ByteBuffer combined = ByteBuffer.allocate(iv.length + encrypted.length);
            combined.put(iv);
            combined.put(encrypted);
            return PREFIX + Base64.getEncoder().encodeToString(combined.array());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encrypt integration access token", e);
        }
    }

    public String decrypt(String ciphertext) {
        if (ciphertext == null || !ciphertext.startsWith(PREFIX)) {
            throw new IllegalArgumentException("Unsupported encrypted token format");
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(ciphertext.substring(PREFIX.length()));
            if (decoded.length <= IV_LENGTH) {
                throw new IllegalArgumentException("Encrypted token payload is truncated");
            }
            byte[] iv = new byte[IV_LENGTH];
            byte[] encrypted = new byte[decoded.length - IV_LENGTH];
            System.arraycopy(decoded, 0, iv, 0, IV_LENGTH);
            System.arraycopy(decoded, IV_LENGTH, encrypted, 0, encrypted.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decrypt integration access token", e);
        }
    }

    private static SecretKeySpec deriveKey(String rawSecret) {
        try {
            String effective = (rawSecret == null || rawSecret.isBlank())
                    ? "vju-clubhub-local-fb-aes256-key-2026"
                    : rawSecret;
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(effective.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(digest, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize AES-256 key", e);
        }
    }
}
