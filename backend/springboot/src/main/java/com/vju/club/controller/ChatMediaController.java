package com.vju.club.controller;

import com.vju.club.common.ApiPaths;
import com.vju.club.dto.request.ChatQuickReplyRequest;
import com.vju.club.dto.response.ChatAttachmentResponse;
import com.vju.club.dto.response.ChatQuickReplyResponse;
import com.vju.club.error.ApiException;
import com.vju.club.security.Actor;
import com.vju.club.service.impl.ChatMediaService;
import com.vju.club.service.impl.ChatQuickReplyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
@Tag(name = "Chat Media & Quick Replies", description = "Tải lên và phát trực tuyến ảnh/video/tệp chat (hỗ trợ HTTP Range + ETag Cache) và quản lý Tin nhắn nhanh CLB.")
public class ChatMediaController {
    private final ChatMediaService chatMediaService;
    private final ChatQuickReplyService quickReplyService;

    @PostMapping(value = ApiPaths.CHANNEL_ATTACHMENTS, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tải hình ảnh, video hoặc tệp đính kèm lên kênh trao đổi")
    public ResponseEntity<ChatAttachmentResponse> uploadAttachment(
            Actor actor,
            @PathVariable UUID channelId,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatMediaService.uploadAttachment(actor, channelId, file));
    }

    @GetMapping(ApiPaths.CHAT_ATTACHMENT_STREAM)
    @Operation(summary = "Phát trực tuyến hoặc tải tệp đính kèm chat (hỗ trợ ETag cache & HTTP 206 Range cho video)")
    public ResponseEntity<Resource> streamAttachment(
            Actor actor,
            @PathVariable UUID attachmentId,
            @RequestParam(defaultValue = "false") boolean download,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch,
            @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader) throws IOException {
        ChatMediaService.StreamedAttachment streamed = chatMediaService.openStream(actor, attachmentId);
        var meta = streamed.metadata();
        var stored = streamed.stored();
        String etag = "\"" + meta.getChecksumSha256() + "\"";

        if (!download && ifNoneMatch != null && ifNoneMatch.contains(etag)) {
            stored.content().close();
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
                    .header(HttpHeaders.ETAG, etag)
                    .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400, immutable")
                    .build();
        }

        long total = stored.size() > 0 ? stored.size() : meta.getSizeBytes();
        ContentDisposition disposition = (download ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(meta.getFileName(), StandardCharsets.UTF_8)
                .build();
        MediaType mediaType = MediaType.parseMediaType(meta.getContentType());

        if (!download && rangeHeader != null && rangeHeader.startsWith("bytes=") && total > 0) {
            long[] range = parseByteRange(rangeHeader, total, stored.content());
            long start = range[0];
            long end = range[1];
            long contentLength = end - start + 1;
            skipFully(stored.content(), start);
            InputStream slice = new BoundedInputStream(stored.content(), contentLength);
            return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                    .contentType(mediaType)
                    .contentLength(contentLength)
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .header(HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + total)
                    .header(HttpHeaders.ETAG, etag)
                    .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400, immutable")
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                    .body(new InputStreamResource(slice));
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(total)
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .header(HttpHeaders.ETAG, etag)
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400, immutable")
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(new InputStreamResource(stored.content()));
    }

    @GetMapping(ApiPaths.CLUB_QUICK_REPLIES)
    @Operation(summary = "Danh sách tin nhắn nhanh của câu lạc bộ")
    public List<ChatQuickReplyResponse> listQuickReplies(Actor actor, @PathVariable UUID clubId) {
        return quickReplyService.listQuickReplies(actor, clubId);
    }

    @PostMapping(ApiPaths.CLUB_QUICK_REPLIES)
    @Operation(summary = "Tạo tin nhắn nhanh mới cho câu lạc bộ")
    public ResponseEntity<ChatQuickReplyResponse> createQuickReply(
            Actor actor,
            @PathVariable UUID clubId,
            @Valid @RequestBody ChatQuickReplyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quickReplyService.createQuickReply(actor, clubId, request));
    }

    @PutMapping(ApiPaths.CLUB_QUICK_REPLY_BY_ID)
    @Operation(summary = "Cập nhật tin nhắn nhanh")
    public ChatQuickReplyResponse updateQuickReply(
            Actor actor,
            @PathVariable UUID clubId,
            @PathVariable UUID replyId,
            @Valid @RequestBody ChatQuickReplyRequest request) {
        return quickReplyService.updateQuickReply(actor, clubId, replyId, request);
    }

    @DeleteMapping(ApiPaths.CLUB_QUICK_REPLY_BY_ID)
    @Operation(summary = "Xóa tin nhắn nhanh")
    public ResponseEntity<Void> deleteQuickReply(Actor actor, @PathVariable UUID clubId, @PathVariable UUID replyId) {
        quickReplyService.deleteQuickReply(actor, clubId, replyId);
        return ResponseEntity.noContent().build();
    }

    private static long[] parseByteRange(String header, long total, InputStream streamToCloseOnError) throws IOException {
        try {
            String spec = header.substring("bytes=".length()).split(",")[0].strip();
            int dash = spec.indexOf('-');
            long start;
            long end;
            if (dash == 0) {
                long suffix = Long.parseLong(spec.substring(1));
                start = Math.max(0, total - suffix);
                end = total - 1;
            } else {
                start = Long.parseLong(spec.substring(0, dash));
                end = dash == spec.length() - 1 ? total - 1 : Long.parseLong(spec.substring(dash + 1));
                end = Math.min(end, total - 1);
            }
            if (start < 0 || start >= total || end < start) {
                throw new IllegalArgumentException("Invalid range");
            }
            return new long[]{start, end};
        } catch (RuntimeException ex) {
            streamToCloseOnError.close();
            throw new ApiException(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE, "VALIDATION_ERROR", "Requested byte range is invalid");
        }
    }

    private static void skipFully(InputStream in, long bytes) throws IOException {
        long remaining = bytes;
        while (remaining > 0) {
            long skipped = in.skip(remaining);
            if (skipped <= 0) {
                if (in.read() == -1) break;
                skipped = 1;
            }
            remaining -= skipped;
        }
    }

    private static final class BoundedInputStream extends FilterInputStream {
        private long remaining;

        BoundedInputStream(InputStream in, long limit) {
            super(in);
            this.remaining = limit;
        }

        @Override
        public int read() throws IOException {
            if (remaining <= 0) return -1;
            int b = super.read();
            if (b != -1) remaining--;
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (remaining <= 0) return -1;
            int toRead = (int) Math.min(len, remaining);
            int read = super.read(b, off, toRead);
            if (read > 0) remaining -= read;
            return read;
        }
    }
}
