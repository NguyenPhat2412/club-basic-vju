package com.vju.club.storage;

import com.vju.club.dto.record.UploadedFile;
import com.vju.club.error.ApiException;
import org.springframework.http.HttpStatus;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/** Reads an uploaded image and trusts only its magic bytes (PNG, JPEG, GIF, WEBP), never the client's name or type. */
public final class ImageUploads {
    private ImageUploads() { }

    public record ValidatedImage(byte[] bytes, String contentType, String extension) { }

    public static ValidatedImage read(UploadedFile file, long maxBytes) {
        if (file == null || file.originalName() == null || file.originalName().isBlank() || file.content() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_IMAGE", "Vui lòng chọn file ảnh để tải lên");
        }
        byte[] bytes;
        try (InputStream in = file.content().open();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            long total = 0;
            int read;
            while ((read = in.read(buf)) != -1) {
                total += read;
                if (total > maxBytes) {
                    throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "IMAGE_TOO_LARGE",
                            "Kích thước ảnh vượt quá giới hạn " + (maxBytes / (1024 * 1024)) + " MB");
                }
                out.write(buf, 0, read);
            }
            bytes = out.toByteArray();
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_IMAGE_STREAM", "Không thể đọc dữ liệu file ảnh");
        }
        if (bytes.length < 8) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_IMAGE", "File ảnh rỗng hoặc không hợp lệ");
        }
        if (isPng(bytes)) {
            return new ValidatedImage(bytes, "image/png", ".png");
        }
        if (isJpeg(bytes)) {
            return new ValidatedImage(bytes, "image/jpeg", ".jpg");
        }
        if (isGif(bytes)) {
            return new ValidatedImage(bytes, "image/gif", ".gif");
        }
        if (isWebp(bytes)) {
            return new ValidatedImage(bytes, "image/webp", ".webp");
        }
        throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_IMAGE_TYPE",
                "Chỉ hỗ trợ định dạng ảnh PNG, JPG/JPEG, WEBP hoặc GIF");
    }

    private static boolean isPng(byte[] b) {
        return b.length >= 8
                && (b[0] & 0xFF) == 0x89
                && b[1] == 0x50
                && b[2] == 0x4E
                && b[3] == 0x47
                && b[4] == 0x0D
                && b[5] == 0x0A
                && b[6] == 0x1A
                && b[7] == 0x0A;
    }

    private static boolean isJpeg(byte[] b) {
        return b.length >= 3
                && (b[0] & 0xFF) == 0xFF
                && (b[1] & 0xFF) == 0xD8
                && (b[2] & 0xFF) == 0xFF;
    }

    private static boolean isGif(byte[] b) {
        return b.length >= 6
                && b[0] == 'G'
                && b[1] == 'I'
                && b[2] == 'F'
                && b[3] == '8'
                && (b[4] == '7' || b[4] == '9')
                && b[5] == 'a';
    }

    private static boolean isWebp(byte[] b) {
        return b.length >= 12
                && b[0] == 'R'
                && b[1] == 'I'
                && b[2] == 'F'
                && b[3] == 'F'
                && b[8] == 'W'
                && b[9] == 'E'
                && b[10] == 'B'
                && b[11] == 'P';
    }

}
