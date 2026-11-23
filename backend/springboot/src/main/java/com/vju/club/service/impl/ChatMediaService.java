package com.vju.club.service.impl;

import com.vju.club.common.ChatConstants;
import com.vju.club.common.DocumentConstants;
import com.vju.club.dto.response.ChatAttachmentResponse;
import com.vju.club.dto.response.ChatMessageResponse;
import com.vju.club.entity.ChatChannel;
import com.vju.club.entity.ChatMessage;
import com.vju.club.entity.ChatMessageAttachment;
import com.vju.club.entity.User;
import com.vju.club.enums.ChatAttachmentKind;
import com.vju.club.enums.DocumentFileType;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ChatMessageAttachmentRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.RateLimitDecision;
import com.vju.club.security.RateLimitService;
import com.vju.club.storage.DocumentStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatMediaService {
    private static final long MAX_IMAGE_OR_FILE_BYTES = 20L * 1024 * 1024;
    private static final long MAX_VIDEO_BYTES = 50L * 1024 * 1024;
    private static final int MAX_ATTACHMENTS_PER_MESSAGE = 8;
    private static final Set<String> IMAGE_EXTS = Set.of("png", "jpg", "jpeg", "gif", "webp");
    private static final Map<String, String> VIDEO_MIME = Map.of(
            "mp4", "video/mp4",
            "webm", "video/webm",
            "mov", "video/quicktime"
    );
    private static final byte[] EBML_MAGIC = {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3};
    private static final Set<String> MP4_BOXES = Set.of("ftyp", "moov", "mdat", "wide", "free");

    private final ChatMessageAttachmentRepository attachmentRepository;
    private final UserRepository userRepository;
    private final ChatAccessPolicy chatAccessPolicy;
    private final DocumentStorage documentStorage;

    @Autowired(required = false)
    private RateLimitService rateLimitService;
    @Autowired(required = false)
    private ClubStorageQuotaService storageQuotaService;
    @Autowired(required = false)
    private com.vju.club.service.SystemSettingsService settingsService;
    @Autowired(required = false)
    private Clock clock;

    private static final int DEFAULT_MAX_CHANNELS_PER_CLUB = 30;
    private static final int DEFAULT_CHAT_MESSAGES_PER_MINUTE = 20;

    public void requireChannelQuota(long currentChannelCount) {
        int maxChannels = (settingsService != null && settingsService.current() != null)
                ? settingsService.current().maxChannelsPerClub()
                : DEFAULT_MAX_CHANNELS_PER_CLUB;
        if (maxChannels > 0 && currentChannelCount >= maxChannels) {
            throw new ApiException(HttpStatus.CONFLICT, "CHAT_CHANNEL_LIMIT_REACHED",
                    "Mỗi câu lạc bộ chỉ được tạo tối đa " + maxChannels + " kênh chat.");
        }
    }

    public void requireMessageRateLimit(UUID actorId) {
        if (rateLimitService == null) {
            return;
        }
        int maxPerMin = (settingsService != null && settingsService.current() != null)
                ? settingsService.current().chatMessagesPerMinute()
                : DEFAULT_CHAT_MESSAGES_PER_MINUTE;
        RateLimitDecision decision = rateLimitService.check("chat-msg:" + actorId, maxPerMin, java.time.Duration.ofMinutes(1));
        if (!decision.allowed()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "CHAT_RATE_LIMIT_EXCEEDED",
                    "Bạn gửi tin nhắn quá nhanh (tối đa " + maxPerMin + " tin/phút). Vui lòng thử lại sau "
                            + decision.retryAfterSeconds() + " giây.");
        }
    }

    public record StreamedAttachment(ChatMessageAttachment metadata, DocumentStorage.StoredObject stored) { }

    @Transactional
    public ChatAttachmentResponse uploadAttachment(Actor actor, UUID channelId, MultipartFile file) {
        ChatChannel channel = chatAccessPolicy.requireChannelAccessById(actor, channelId, ChatConstants.PERMISSION_SEND, true);
        if (rateLimitService != null) {
            RateLimitDecision decision = rateLimitService.checkChatUpload(actor.id());
            if (!decision.allowed()) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "CHAT_UPLOAD_RATE_LIMIT_EXCEEDED",
                        "Bạn đang tải tệp quá nhanh (tối đa " + rateLimitService.chatUploadLimit()
                                + " tệp / 5 phút). Vui lòng thử lại sau " + decision.retryAfterSeconds() + " giây.");
            }
        }
        User uploader = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_DOCUMENT", "Uploaded file is empty");
        }
        String cleanName = sanitizeFileName(file.getOriginalFilename());
        String ext = cleanName.substring(cleanName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        ChatAttachmentKind kind;
        String resolvedContentType;
        long maxBytes;

        if (VIDEO_MIME.containsKey(ext)) {
            kind = ChatAttachmentKind.VIDEO;
            resolvedContentType = VIDEO_MIME.get(ext);
            maxBytes = MAX_VIDEO_BYTES;
        } else {
            DocumentFileType docType = DocumentFileType.fromExtension(ext)
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_DOCUMENT_TYPE",
                            "File type ." + ext + " is not supported in chat"));
            kind = IMAGE_EXTS.contains(ext) ? ChatAttachmentKind.IMAGE : ChatAttachmentKind.FILE;
            resolvedContentType = docType.contentType();
            maxBytes = MAX_IMAGE_OR_FILE_BYTES;
        }

        UUID attachmentId = UUID.randomUUID();
        String storageKey = "chat/" + channel.getClub().getId() + "/" + channelId + "/" + attachmentId + "." + ext;
        Path tempFile = null;
        try {
            tempFile = Files.createTempFile("chat-att-", "." + ext);
            byte[] head = new byte[32];
            int headLen = 0;
            long totalBytes = 0;
            MessageDigest digest = sha256();
            try (InputStream in = file.getInputStream(); var out = Files.newOutputStream(tempFile)) {
                byte[] buf = new byte[64 * 1024];
                int read;
                while ((read = in.read(buf)) != -1) {
                    if (headLen < head.length) {
                        int copy = Math.min(read, head.length - headLen);
                        System.arraycopy(buf, 0, head, headLen, copy);
                        headLen += copy;
                    }
                    totalBytes += read;
                    if (totalBytes > maxBytes) {
                        throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "DOCUMENT_TOO_LARGE",
                                "File exceeds maximum size of " + (maxBytes / (1024 * 1024)) + " MB");
                    }
                    digest.update(buf, 0, read);
                    out.write(buf, 0, read);
                }
            }
            if (totalBytes == 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_DOCUMENT", "Uploaded file is empty");
            }
            verifyMagicBytes(ext, kind, head, headLen);
            if (storageQuotaService != null) {
                storageQuotaService.requireQuotaAvailable(channel.getClub().getId(), totalBytes);
            }
            try (InputStream storeIn = Files.newInputStream(tempFile)) {
                documentStorage.put(storageKey, storeIn, totalBytes, resolvedContentType);
            }

            ChatMessageAttachment entity = new ChatMessageAttachment();
            entity.setId(attachmentId);
            entity.setChannel(channel);
            entity.setUploader(uploader);
            entity.setFileName(cleanName);
            entity.setContentType(resolvedContentType);
            entity.setMediaKind(kind);
            entity.setSizeBytes(totalBytes);
            entity.setStorageKey(storageKey);
            entity.setChecksumSha256(HexFormat.of().formatHex(digest.digest()));
            entity.setSortOrder(0);
            return ChatAttachmentResponse.from(attachmentRepository.save(entity));
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "DOCUMENT_STORAGE_ERROR", "Could not store chat attachment");
        } finally {
            if (tempFile != null) {
                try {
                    Files.deleteIfExists(tempFile);
                } catch (IOException ignored) {
                }
            }
        }
    }

    @Transactional
    public List<ChatAttachmentResponse> bindAttachments(Actor actor, ChatChannel channel, ChatMessage message, List<UUID> rawIds) {
        if (rawIds == null || rawIds.isEmpty()) return List.of();
        List<UUID> orderedUnique = new ArrayList<>(new LinkedHashSet<>(rawIds));
        if (orderedUnique.size() > MAX_ATTACHMENTS_PER_MESSAGE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MAX_ATTACHMENTS_EXCEEDED",
                    "At most " + MAX_ATTACHMENTS_PER_MESSAGE + " attachments per message");
        }
        Map<UUID, ChatMessageAttachment> found = attachmentRepository.findByIdIn(orderedUnique).stream()
                .collect(Collectors.toMap(ChatMessageAttachment::getId, Function.identity()));
        List<ChatMessageAttachment> bound = new ArrayList<>(orderedUnique.size());
        for (int i = 0; i < orderedUnique.size(); i++) {
            ChatMessageAttachment att = found.get(orderedUnique.get(i));
            if (att == null || !att.getChannel().getId().equals(channel.getId())) {
                throw new ApiException(HttpStatus.NOT_FOUND, "DOCUMENT_NOT_FOUND", "Chat attachment not found in channel");
            }
            if (!att.getUploader().getId().equals(actor.id())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Cannot attach another user's upload");
            }
            if (att.getMessage() != null && !att.getMessage().getId().equals(message.getId())) {
                throw new ApiException(HttpStatus.CONFLICT, "DATA_CONFLICT", "Attachment is already linked to a message");
            }
            att.setMessage(message);
            att.setSortOrder(i);
            bound.add(att);
        }
        return attachmentRepository.saveAll(bound).stream().map(ChatAttachmentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> enrichMessages(List<ChatMessageResponse> messages) {
        if (messages == null || messages.isEmpty()) return List.of();
        List<UUID> ids = messages.stream().map(ChatMessageResponse::id).toList();
        Map<UUID, List<ChatAttachmentResponse>> byMsg = attachmentRepository
                .findByMessage_IdInOrderBySortOrderAscCreatedAtAsc(ids)
                .stream()
                .collect(Collectors.groupingBy(
                        a -> a.getMessage().getId(),
                        Collectors.mapping(ChatAttachmentResponse::from, Collectors.toList())
                ));
        if (byMsg.isEmpty()) return messages;
        return messages.stream()
                .map(m -> byMsg.containsKey(m.id()) ? m.withAttachments(byMsg.get(m.id()), m.clientTempId()) : m)
                .toList();
    }

    @Transactional(readOnly = true)
    public StreamedAttachment openStream(Actor actor, UUID attachmentId) {
        ChatMessageAttachment att = attachmentRepository.findWithChannelById(attachmentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DOCUMENT_NOT_FOUND", "Attachment not found"));
        chatAccessPolicy.requireChannelAccess(actor, att.getChannel(), ChatConstants.PERMISSION_VIEW, false);
        return new StreamedAttachment(att, documentStorage.open(att.getStorageKey()));
    }

    public void deleteAttachmentsForMessage(UUID messageId) {
        for (ChatMessageAttachment att : attachmentRepository.findByMessage_Id(messageId)) {
            deleteStorageSilently(att.getStorageKey());
        }
    }

    public void deleteAttachmentsForChannel(UUID channelId) {
        for (ChatMessageAttachment att : attachmentRepository.findByChannel_Id(channelId)) {
            deleteStorageSilently(att.getStorageKey());
        }
    }

    @Scheduled(fixedDelayString = "${app.chat.orphan-cleanup-interval:3600000}")
    @Transactional
    public int purgeOrphanAttachments() {
        Clock effectiveClock = clock != null ? clock : Clock.systemUTC();
        OffsetDateTime cutoff = OffsetDateTime.now(effectiveClock).minusHours(24);
        List<ChatMessageAttachment> orphans = attachmentRepository.findByMessageIsNullAndCreatedAtBefore(cutoff);
        if (orphans.isEmpty()) {
            return 0;
        }
        for (ChatMessageAttachment orphan : orphans) {
            deleteStorageSilently(orphan.getStorageKey());
        }
        attachmentRepository.deleteAll(orphans);
        return orphans.size();
    }

    private void deleteStorageSilently(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) return;
        try {
            documentStorage.delete(storageKey);
        } catch (RuntimeException ignored) {
        }
    }

    private static String sanitizeFileName(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DOCUMENT_NAME", "File name is required");
        }
        String name = Normalizer.normalize(raw, Normalizer.Form.NFC).strip();
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (slash >= 0) name = name.substring(slash + 1).strip();
        if (name.startsWith(".") || name.endsWith(".") || name.length() > DocumentConstants.MAX_NAME_LENGTH) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DOCUMENT_NAME", "Invalid file name");
        }
        for (int i = 0; i < name.length(); i++) {
            char c = name.charAt(i);
            if (Character.isISOControl(c) || Character.getType(c) == Character.FORMAT
                    || DocumentConstants.FORBIDDEN_NAME_CHARACTERS.indexOf(c) >= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DOCUMENT_NAME", "File name contains invalid characters");
            }
        }
        String[] parts = name.split("\\.");
        if (parts.length < 2) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DOCUMENT_NAME", "File extension is required");
        }
        for (int i = 1; i < parts.length - 1; i++) {
            if (DocumentConstants.EXECUTABLE_EXTENSIONS.contains(parts[i].strip().toLowerCase(Locale.ROOT))) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "SUSPICIOUS_DOCUMENT_NAME", "Suspicious double file extension");
            }
        }
        return name;
    }

    private static void verifyMagicBytes(String ext, ChatAttachmentKind kind, byte[] head, int len) {
        if (kind == ChatAttachmentKind.VIDEO) {
            boolean valid = "webm".equals(ext)
                    ? len >= 4 && head[0] == EBML_MAGIC[0] && head[1] == EBML_MAGIC[1]
                            && head[2] == EBML_MAGIC[2] && head[3] == EBML_MAGIC[3]
                    : len >= 8 && MP4_BOXES.contains(new String(head, 4, 4, StandardCharsets.US_ASCII));
            if (!valid) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "DOCUMENT_CONTENT_MISMATCH",
                        "Video content does not match ." + ext + " container format");
            }
            return;
        }
        DocumentFileType docType = DocumentFileType.fromExtension(ext).orElseThrow();
        if (!docType.matches(head, len)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DOCUMENT_CONTENT_MISMATCH",
                    "File content does not match ." + ext + " format");
        }
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
