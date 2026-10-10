package com.vju.club.modules.document.service;

import com.vju.club.config.StorageProperties;
import com.vju.club.modules.document.common.DocumentConstants;
import com.vju.club.modules.document.enums.DocumentFileType;
import com.vju.club.modules.document.exception.DocumentContentMismatchException;
import com.vju.club.modules.document.exception.DocumentStorageException;
import com.vju.club.modules.document.exception.DocumentTooLargeException;
import com.vju.club.modules.document.exception.EmptyDocumentException;
import com.vju.club.modules.document.exception.InvalidAppDetailKeyException;
import com.vju.club.modules.document.exception.InvalidDocumentNameException;
import com.vju.club.modules.document.exception.SuspiciousDocumentNameException;
import com.vju.club.modules.document.exception.UnsupportedDocumentTypeException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.util.HexFormat;
import java.util.Locale;

@Component
@RequiredArgsConstructor
public class DocumentFileInspector {
    private final StorageProperties properties;

    public record InspectedFile(String name, DocumentFileType type, long size, String sha256) { }

    @FunctionalInterface
    public interface ContentSource {
        InputStream open() throws IOException;
    }

    public InspectedFile inspect(String rawName, ContentSource content) {
        String name = checkName(rawName);
        DocumentFileType type = typeOf(name);
        MessageDigest digest = sha256();
        byte[] head = new byte[DocumentConstants.SIGNATURE_BYTES];
        int headLength = 0;
        long size = 0;
        long max = properties.getMaxFileSize().toBytes();
        try (InputStream in = content.open()) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) {
                if (headLength < head.length) {
                    int copied = Math.min(read, head.length - headLength);
                    System.arraycopy(buffer, 0, head, headLength, copied);
                    headLength += copied;
                }
                digest.update(buffer, 0, read);
                size += read;
                if (size > max) throw new DocumentTooLargeException(
                        "File is larger than the allowed " + properties.getMaxFileSize().toMegabytes() + " MB");
            }
        } catch (IOException exception) {
            throw new DocumentStorageException("Uploaded file could not be read", exception);
        }
        if (size == 0) throw new EmptyDocumentException();
        if (!type.matches(head, headLength)) {
            throw new DocumentContentMismatchException(
                    "File content is not a ." + type.extension() + " file");
        }
        return new InspectedFile(name, type, size, HexFormat.of().formatHex(digest.digest()));
    }

    public String checkName(String raw) {
        if (raw == null || raw.isBlank()) throw new InvalidDocumentNameException("Document name is required");
        String name = Normalizer.normalize(raw, Normalizer.Form.NFC).strip();
        for (int i = 0; i < name.length(); i++) {
            char c = name.charAt(i);
            if (Character.getType(c) == Character.FORMAT) {
                throw new SuspiciousDocumentNameException("Document name contains invisible or direction-changing characters");
            }
            if (Character.isISOControl(c)) {
                throw new InvalidDocumentNameException("Document name contains control characters");
            }
            if (c == '/' || c == '\\') {
                throw new InvalidDocumentNameException("Document name must be a file name, not a path");
            }
            if (DocumentConstants.FORBIDDEN_NAME_CHARACTERS.indexOf(c) >= 0) {
                throw new InvalidDocumentNameException(
                        "Document name must not contain any of " + DocumentConstants.FORBIDDEN_NAME_CHARACTERS);
            }
        }
        if (name.startsWith(".")) throw new InvalidDocumentNameException("Document name must not start with a dot");
        if (name.endsWith(".")) throw new InvalidDocumentNameException("Document name must not end with a dot");
        if (name.length() > DocumentConstants.MAX_NAME_LENGTH
                || name.getBytes(StandardCharsets.UTF_8).length > DocumentConstants.MAX_NAME_LENGTH) {
            throw new InvalidDocumentNameException(
                    "Document name must be at most " + DocumentConstants.MAX_NAME_LENGTH + " bytes");
        }
        String[] parts = name.split("\\.");
        if (parts.length < 2) throw new InvalidDocumentNameException("Document name needs a file extension, for example .pdf");
        if (DocumentConstants.WINDOWS_RESERVED_NAMES.contains(parts[0].strip().toLowerCase(Locale.ROOT))) {
            throw new InvalidDocumentNameException("Document name is a reserved device name");
        }
        for (int i = 1; i < parts.length - 1; i++) {
            if (DocumentConstants.EXECUTABLE_EXTENSIONS.contains(parts[i].strip().toLowerCase(Locale.ROOT))) {
                throw new SuspiciousDocumentNameException(
                        "Document name hides a program extension (." + parts[i].strip() + ") before the real one");
            }
        }
        if (name.matches(".*\\s{3,}.*")) {
            throw new SuspiciousDocumentNameException("Document name contains a long run of spaces");
        }
        String extension = parts[parts.length - 1];
        if (!extension.equals(extension.strip())) {
            throw new SuspiciousDocumentNameException("Document name has spaces around its extension");
        }
        typeOf(name);
        return name;
    }

    public DocumentFileType typeOf(String name) {
        String extension = name.substring(name.lastIndexOf('.') + 1);
        return DocumentFileType.fromExtension(extension).orElseThrow(() ->
                DocumentConstants.EXECUTABLE_EXTENSIONS.contains(extension.toLowerCase(Locale.ROOT))
                        ? new UnsupportedDocumentTypeException("Programs and scripts cannot be uploaded")
                        : new UnsupportedDocumentTypeException("File type ." + extension + " is not allowed"));
    }

    public String checkAppDetailKey(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String key = raw.strip();
        if (key.length() > DocumentConstants.MAX_APP_DETAIL_KEY_LENGTH
                || !key.matches(DocumentConstants.APP_DETAIL_KEY_PATTERN)) {
            throw new InvalidAppDetailKeyException();
        }
        return key;
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
