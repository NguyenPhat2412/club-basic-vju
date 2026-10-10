package com.vju.club.modules.document.enums;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

public enum DocumentFileType {
    PDF("pdf", "application/pdf", Signature.PDF),
    DOC("doc", "application/msword", Signature.OLE),
    DOCX("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", Signature.ZIP),
    XLS("xls", "application/vnd.ms-excel", Signature.OLE),
    XLSX("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Signature.ZIP),
    PPT("ppt", "application/vnd.ms-powerpoint", Signature.OLE),
    PPTX("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", Signature.ZIP),
    TXT("txt", "text/plain; charset=utf-8", Signature.TEXT),
    CSV("csv", "text/csv; charset=utf-8", Signature.TEXT),
    MD("md", "text/markdown; charset=utf-8", Signature.TEXT),
    PNG("png", "image/png", Signature.PNG),
    JPG("jpg", "image/jpeg", Signature.JPEG),
    JPEG("jpeg", "image/jpeg", Signature.JPEG),
    GIF("gif", "image/gif", Signature.GIF),
    WEBP("webp", "image/webp", Signature.WEBP),
    ZIP("zip", "application/zip", Signature.ZIP);

    private final String extension;
    private final String contentType;
    private final Signature signature;

    DocumentFileType(String extension, String contentType, Signature signature) {
        this.extension = extension;
        this.contentType = contentType;
        this.signature = signature;
    }

    public String extension() { return extension; }
    public String contentType() { return contentType; }

    public static Optional<DocumentFileType> fromExtension(String extension) {
        String lower = extension.toLowerCase(Locale.ROOT);
        return Arrays.stream(values()).filter(type -> type.extension.equals(lower)).findFirst();
    }

    public boolean matches(byte[] head, int length) {
        return signature.matches(head, length);
    }

    private enum Signature {
        PDF, OLE, ZIP, PNG, JPEG, GIF, WEBP, TEXT;

        private static final byte[] PDF_MAGIC = "%PDF-".getBytes(StandardCharsets.US_ASCII);
        private static final byte[] OLE_MAGIC = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1};
        private static final byte[] ZIP_MAGIC = {0x50, 0x4B, 0x03, 0x04};
        private static final byte[] ZIP_EMPTY_MAGIC = {0x50, 0x4B, 0x05, 0x06};
        private static final byte[] PNG_MAGIC = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
        private static final byte[] GIF87_MAGIC = "GIF87a".getBytes(StandardCharsets.US_ASCII);
        private static final byte[] GIF89_MAGIC = "GIF89a".getBytes(StandardCharsets.US_ASCII);
        private static final byte[] RIFF_MAGIC = "RIFF".getBytes(StandardCharsets.US_ASCII);
        private static final byte[] WEBP_MAGIC = "WEBP".getBytes(StandardCharsets.US_ASCII);
        private static final byte[] WINDOWS_EXE_MAGIC = {0x4D, 0x5A};
        private static final byte[] ELF_MAGIC = {0x7F, 0x45, 0x4C, 0x46};

        boolean matches(byte[] head, int length) {
            return switch (this) {
                case PDF -> startsWith(head, length, 0, PDF_MAGIC);
                case OLE -> startsWith(head, length, 0, OLE_MAGIC);
                case ZIP -> startsWith(head, length, 0, ZIP_MAGIC) || startsWith(head, length, 0, ZIP_EMPTY_MAGIC);
                case PNG -> startsWith(head, length, 0, PNG_MAGIC);
                case JPEG -> startsWith(head, length, 0, JPEG_MAGIC);
                case GIF -> startsWith(head, length, 0, GIF87_MAGIC) || startsWith(head, length, 0, GIF89_MAGIC);
                case WEBP -> startsWith(head, length, 0, RIFF_MAGIC) && startsWith(head, length, 8, WEBP_MAGIC);
                case TEXT -> !startsWith(head, length, 0, WINDOWS_EXE_MAGIC) && !startsWith(head, length, 0, ELF_MAGIC)
                        && !containsNul(head, length);
            };
        }

        private static boolean startsWith(byte[] head, int length, int offset, byte[] magic) {
            if (length < offset + magic.length) return false;
            for (int i = 0; i < magic.length; i++) {
                if (head[offset + i] != magic[i]) return false;
            }
            return true;
        }

        private static boolean containsNul(byte[] head, int length) {
            for (int i = 0; i < length; i++) {
                if (head[i] == 0) return true;
            }
            return false;
        }
    }
}
