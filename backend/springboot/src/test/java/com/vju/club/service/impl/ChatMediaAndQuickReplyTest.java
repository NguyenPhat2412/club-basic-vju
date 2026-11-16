package com.vju.club.service.impl;

import com.vju.club.dto.request.ChatQuickReplyRequest;
import com.vju.club.dto.response.ChatAttachmentResponse;
import com.vju.club.entity.ChatChannel;
import com.vju.club.entity.ChatMessage;
import com.vju.club.entity.ChatMessageAttachment;
import com.vju.club.entity.ChatQuickReply;
import com.vju.club.entity.Club;
import com.vju.club.entity.User;
import com.vju.club.enums.ClubStatus;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.ChatMapper;
import com.vju.club.repository.ChatMessageAttachmentRepository;
import com.vju.club.repository.ChatMessageRepository;
import com.vju.club.repository.ChatQuickReplyRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.storage.impl.LocalDocumentStorage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mapstruct.factory.Mappers;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ChatMediaAndQuickReplyTest {

    @TempDir
    Path tempStorageDir;

    @Test
    void uploadAndBindSupportsPngMp4AndWebmWhileRejectingSpoofedVideos() {
        ChatMessageAttachmentRepository attRepo = mock(ChatMessageAttachmentRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        ChatAccessPolicy accessPolicy = mock(ChatAccessPolicy.class);
        LocalDocumentStorage storage = new LocalDocumentStorage(tempStorageDir);
        ChatMediaService service = new ChatMediaService(attRepo, userRepo, accessPolicy, storage);

        UUID actorId = UUID.randomUUID();
        UUID clubId = UUID.randomUUID();
        UUID channelId = UUID.randomUUID();
        Actor actor = new Actor(actorId);

        Club club = new Club();
        club.setId(clubId);
        club.setStatus(ClubStatus.ACTIVE);
        ChatChannel channel = new ChatChannel();
        channel.setId(channelId);
        channel.setClub(club);
        User user = new User();
        user.setId(actorId);
        user.setFullName("Nguyễn Văn A");

        when(accessPolicy.requireChannelAccessById(actor, channelId, "chat.send", true)).thenReturn(channel);
        when(userRepo.findById(actorId)).thenReturn(Optional.of(user));
        when(attRepo.save(any(ChatMessageAttachment.class))).thenAnswer(inv -> inv.getArgument(0));

        byte[] pngBytes = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4};
        ChatAttachmentResponse pngRes = service.uploadAttachment(
                actor, channelId, new MockMultipartFile("file", "highlight-1.png", "image/png", pngBytes));
        assertThat(pngRes.mediaKind()).isEqualTo("IMAGE");
        assertThat(pngRes.contentType()).isEqualTo("image/png");

        byte[] mp4Bytes = new byte[]{0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm', 0, 0, 2, 0};
        ChatAttachmentResponse mp4Res = service.uploadAttachment(
                actor, channelId, new MockMultipartFile("file", "stage-rehearsal.mp4", "video/mp4", mp4Bytes));
        assertThat(mp4Res.mediaKind()).isEqualTo("VIDEO");
        assertThat(mp4Res.contentType()).isEqualTo("video/mp4");

        byte[] webmBytes = new byte[]{0x1A, 0x45, (byte) 0xDF, (byte) 0xA3, 1, 2, 3, 4, 5, 6};
        ChatAttachmentResponse webmRes = service.uploadAttachment(
                actor, channelId, new MockMultipartFile("file", "clip.webm", "video/webm", webmBytes));
        assertThat(webmRes.mediaKind()).isEqualTo("VIDEO");
        assertThat(webmRes.contentType()).isEqualTo("video/webm");

        byte[] spoofedMp4 = "%PDF-1.7 fake video".getBytes(StandardCharsets.US_ASCII);
        assertThatThrownBy(() -> service.uploadAttachment(
                actor, channelId, new MockMultipartFile("file", "fake.mp4", "video/mp4", spoofedMp4)))
                .isInstanceOf(ApiException.class)
                .extracting("code")
                .isEqualTo("DOCUMENT_CONTENT_MISMATCH");

        assertThatThrownBy(() -> service.uploadAttachment(
                actor, channelId, new MockMultipartFile("file", "payload.exe.png", "image/png", pngBytes)))
                .isInstanceOf(ApiException.class)
                .extracting("code")
                .isEqualTo("SUSPICIOUS_DOCUMENT_NAME");

        ChatMessage message = new ChatMessage();
        message.setId(UUID.randomUUID());
        message.setChannel(channel);

        ChatMessageAttachment storedPng = new ChatMessageAttachment();
        storedPng.setId(pngRes.id());
        storedPng.setChannel(channel);
        storedPng.setUploader(user);
        storedPng.setFileName(pngRes.fileName());
        storedPng.setContentType(pngRes.contentType());
        storedPng.setMediaKind(com.vju.club.enums.ChatAttachmentKind.IMAGE);
        storedPng.setSizeBytes(pngRes.sizeBytes());
        storedPng.setStorageKey("chat/key1");
        storedPng.setChecksumSha256(pngRes.checksumSha256());

        ChatMessageAttachment storedMp4 = new ChatMessageAttachment();
        storedMp4.setId(mp4Res.id());
        storedMp4.setChannel(channel);
        storedMp4.setUploader(user);
        storedMp4.setFileName(mp4Res.fileName());
        storedMp4.setContentType(mp4Res.contentType());
        storedMp4.setMediaKind(com.vju.club.enums.ChatAttachmentKind.VIDEO);
        storedMp4.setSizeBytes(mp4Res.sizeBytes());
        storedMp4.setStorageKey("chat/key2");
        storedMp4.setChecksumSha256(mp4Res.checksumSha256());

        when(attRepo.findByIdIn(any())).thenReturn(List.of(storedMp4, storedPng));
        when(attRepo.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        List<ChatAttachmentResponse> bound = service.bindAttachments(
                actor, channel, message, List.of(pngRes.id(), mp4Res.id()));
        assertThat(bound).hasSize(2);
        assertThat(bound.get(0).id()).isEqualTo(pngRes.id());
        assertThat(bound.get(0).sortOrder()).isZero();
        assertThat(bound.get(1).id()).isEqualTo(mp4Res.id());
        assertThat(bound.get(1).sortOrder()).isEqualTo(1);
    }

    @Test
    void quickReplyNormalizesVietnameseShortcutsAndCreatesCleanly() {
        assertThat(ChatQuickReplyService.normalizeShortcut("Điểm danh CLB!")).isEqualTo("/diem-danh-clb");
        assertThat(ChatQuickReplyService.normalizeShortcut("/Lịch Tập_HL")).isEqualTo("/lich-tap_hl");

        ChatQuickReplyRepository qrRepo = mock(ChatQuickReplyRepository.class);
        ClubRepository clubRepo = mock(ClubRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        PermissionAuthorizationService authz = mock(PermissionAuthorizationService.class);
        ChatAccessPolicy accessPolicy = mock(ChatAccessPolicy.class);

        ChatQuickReplyService qrService = new ChatQuickReplyService(qrRepo, clubRepo, userRepo, authz, accessPolicy);
        UUID clubId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Actor actor = new Actor(userId);

        Club club = new Club();
        club.setId(clubId);
        club.setStatus(ClubStatus.ACTIVE);
        User creator = new User();
        creator.setId(userId);
        creator.setFullName("Trần Thị B");

        when(clubRepo.findById(clubId)).thenReturn(Optional.of(club));
        when(accessPolicy.isActiveMember(actor, clubId)).thenReturn(true);
        when(userRepo.findById(userId)).thenReturn(Optional.of(creator));
        when(qrRepo.save(any(ChatQuickReply.class))).thenAnswer(inv -> {
            ChatQuickReply saved = inv.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        var created = qrService.createQuickReply(
                actor, clubId, new ChatQuickReplyRequest("Báo cáo tiến độ", "Báo cáo tuần", "Đã cập nhật tiến độ tuần này!"));
        assertThat(created.shortcut()).isEqualTo("/bao-cao-tien-do");
        assertThat(created.title()).isEqualTo("Báo cáo tuần");
    }

    @Test
    void pinAndUnpinMessageBroadcastsRealtimeEventsAndListsPinnedOrder() {
        ChatAccessPolicy accessPolicy = mock(ChatAccessPolicy.class);
        ChatMessageRepository msgRepo = mock(ChatMessageRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        MembershipRepository memberRepo = mock(MembershipRepository.class);
        DepartmentMemberRepository deptMemberRepo = mock(DepartmentMemberRepository.class);
        ChatMediaService mediaService = mock(ChatMediaService.class);
        ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);
        ChatMapper mapper = Mappers.getMapper(ChatMapper.class);

        ChatPinService pinService = new ChatPinService(
                accessPolicy, msgRepo, userRepo, memberRepo, deptMemberRepo,
                mediaService, mapper, publisher, Clock.systemUTC()
        );

        UUID clubId = UUID.randomUUID();
        UUID channelId = UUID.randomUUID();
        UUID messageId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        Actor actor = new Actor(actorId);

        Club club = new Club();
        club.setId(clubId);
        club.setStatus(ClubStatus.ACTIVE);
        ChatChannel channel = new ChatChannel();
        channel.setId(channelId);
        channel.setClub(club);
        User user = new User();
        user.setId(actorId);
        user.setFullName("Nguyễn Văn Pin");

        ChatMessage message = new ChatMessage();
        message.setId(messageId);
        message.setChannel(channel);
        message.setSender(user);
        message.setContent("Thông báo lịch họp toàn CLB");

        when(accessPolicy.requireChannelAccessById(actor, channelId, "chat.send", true)).thenReturn(channel);
        when(accessPolicy.requireChannelAccessById(actor, channelId, "chat.view", false)).thenReturn(channel);
        when(userRepo.findById(actorId)).thenReturn(Optional.of(user));
        when(msgRepo.findWithRelationsById(messageId)).thenReturn(Optional.of(message));
        when(msgRepo.findPinnedByChannelId(channelId)).thenReturn(List.of());
        when(msgRepo.saveAndFlush(any(ChatMessage.class))).thenAnswer(inv -> inv.getArgument(0));
        when(memberRepo.findActiveUserIdsByClubId(clubId)).thenReturn(List.of(actorId));
        when(mediaService.enrichMessages(any())).thenAnswer(inv -> inv.getArgument(0));

        var pinnedRes = pinService.pinMessage(actor, channelId, messageId);
        assertThat(pinnedRes.pinned()).isTrue();
        assertThat(pinnedRes.pinnedByName()).isEqualTo("Nguyễn Văn Pin");

        var unpinnedRes = pinService.unpinMessage(actor, channelId, messageId);
        assertThat(unpinnedRes.pinned()).isFalse();
        assertThat(unpinnedRes.pinnedAt()).isNull();
    }

    @Test
    void deliveryReceiptServiceTracksSentDeliveredAndSeenWithReaderNames() {
        var readRepo = mock(com.vju.club.repository.ChatChannelReadRepository.class);
        var msgRepo = mock(ChatMessageRepository.class);
        var channelRepo = mock(com.vju.club.repository.ChatChannelRepository.class);
        var userRepo = mock(UserRepository.class);
        var publisher = mock(ApplicationEventPublisher.class);
        var userRegistry = mock(SimpUserRegistry.class);
        Clock fixedClock = Clock.fixed(java.time.Instant.parse("2026-11-16T10:00:00Z"), java.time.ZoneOffset.UTC);

        ChatDeliveryReceiptService receiptService = new ChatDeliveryReceiptService(
                readRepo, msgRepo, channelRepo, userRepo, publisher, fixedClock);
        ReflectionTestUtils.setField(receiptService, "simpUserRegistry", userRegistry);

        UUID senderId = UUID.randomUUID();
        UUID bobId = UUID.randomUUID();
        UUID channelId = UUID.randomUUID();
        UUID clubId = UUID.randomUUID();
        java.time.OffsetDateTime now = java.time.OffsetDateTime.now(fixedClock);

        // 1. Offline recipients -> SENT
        ChatMessage offlineMsg = new ChatMessage();
        receiptService.initializeMessageDelivery(offlineMsg, senderId, List.of(senderId, bobId), now);
        assertThat(offlineMsg.getDeliveryStatus().name()).isEqualTo("SENT");
        assertThat(offlineMsg.getDeliveredAt()).isNull();

        // 2. Online recipient in SimpUserRegistry -> DELIVERED immediately
        when(userRegistry.getUser(bobId.toString())).thenReturn(mock(SimpUser.class));
        ChatMessage onlineMsg = new ChatMessage();
        receiptService.initializeMessageDelivery(onlineMsg, senderId, List.of(senderId, bobId), now);
        assertThat(onlineMsg.getDeliveryStatus().name()).isEqualTo("DELIVERED");
        assertThat(onlineMsg.getDeliveredAt()).isEqualTo(now);

        // 3. Reader row in chat_channel_reads -> enriches SEEN, seenCount=1, seenByNames=["Trần Văn Bob"]
        com.vju.club.repository.ChatChannelReadRepository.ChannelReaderRow readerRow =
                new com.vju.club.repository.ChatChannelReadRepository.ChannelReaderRow() {
                    @Override public UUID getUserId() { return bobId; }
                    @Override public String getFullName() { return "Trần Văn Bob"; }
                    @Override public java.time.Instant getLastReadAt() { return now.plusSeconds(5).toInstant(); }
                };
        when(readRepo.findReadersByChannelId(channelId)).thenReturn(List.of(readerRow));

        Club club = new Club();
        club.setId(clubId);
        ChatChannel channel = new ChatChannel();
        channel.setId(channelId);
        channel.setClub(club);
        onlineMsg.setId(UUID.randomUUID());
        onlineMsg.setChannel(channel);
        User sender = new User();
        sender.setId(senderId);
        onlineMsg.setSender(sender);
        onlineMsg.setContent("Báo cáo tiến độ");
        ReflectionTestUtils.setField(onlineMsg, "createdAt", now);

        ChatMapper mapper = Mappers.getMapper(ChatMapper.class);
        var enriched = receiptService.enrichReceipts(channelId, List.of(mapper.toMessageResponse(onlineMsg)));
        assertThat(enriched).hasSize(1);
        assertThat(enriched.getFirst().deliveryStatus()).isEqualTo("SEEN");
        assertThat(enriched.getFirst().seenCount()).isEqualTo(1);
        assertThat(enriched.getFirst().seenByNames()).containsExactly("Trần Văn Bob");
    }
}
