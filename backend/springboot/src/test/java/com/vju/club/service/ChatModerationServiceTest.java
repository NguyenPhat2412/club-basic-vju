package com.vju.club.service;

import com.vju.club.dto.request.UpdateChatMessageRequest;
import com.vju.club.dto.response.ChatChannelResponse;
import com.vju.club.dto.response.ChatMessageResponse;
import com.vju.club.dto.response.ChatRealtimeEvent;
import com.vju.club.entity.ChatChannel;
import com.vju.club.entity.ChatMessage;
import com.vju.club.entity.Club;
import com.vju.club.entity.User;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.ChatChannelType;
import com.vju.club.enums.ChatMessageStatus;
import com.vju.club.enums.ChatSenderType;
import com.vju.club.enums.ClubStatus;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.ChatMapper;
import com.vju.club.repository.ChatChannelRepository;
import com.vju.club.repository.ChatMessageRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.security.Actor;
import com.vju.club.service.impl.ChatAccessPolicy;
import com.vju.club.service.impl.ChatMediaService;
import com.vju.club.service.impl.ChatModerationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatModerationServiceTest {

    @Mock
    private ChatChannelRepository channelRepository;
    @Mock
    private ChatMessageRepository messageRepository;
    @Mock
    private MembershipRepository membershipRepository;
    @Mock
    private DepartmentMemberRepository departmentMemberRepository;
    @Mock
    private ChatAccessPolicy chatAccessPolicy;
    @Mock
    private ChatMediaService chatMediaService;
    @Mock
    private AuditService auditService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private final ChatMapper chatMapper = Mappers.getMapper(ChatMapper.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-18T08:45:00Z"), ZoneOffset.UTC);

    private ChatModerationService service;
    private UUID clubId;
    private UUID channelId;
    private UUID senderId;
    private UUID moderatorId;
    private UUID strangerId;
    private Club club;
    private ChatChannel channel;
    private ChatMessage message;

    @BeforeEach
    void setUp() {
        service = new ChatModerationService(
                channelRepository,
                messageRepository,
                membershipRepository,
                departmentMemberRepository,
                chatAccessPolicy,
                chatMediaService,
                auditService,
                chatMapper,
                eventPublisher,
                clock
        );

        clubId = UUID.randomUUID();
        channelId = UUID.randomUUID();
        senderId = UUID.randomUUID();
        moderatorId = UUID.randomUUID();
        strangerId = UUID.randomUUID();

        club = new Club();
        club.setId(clubId);
        club.setCode("VJUA");
        club.setName("VJU Arts Club");
        club.setStatus(ClubStatus.ACTIVE);

        channel = new ChatChannel();
        channel.setId(channelId);
        channel.setClub(club);
        channel.setName("thong-bao-chung");
        channel.setChannelType(ChatChannelType.CLUB_GENERAL);
        channel.setCreatedAt(OffsetDateTime.now(clock));
        channel.setUpdatedAt(OffsetDateTime.now(clock));

        User sender = new User();
        sender.setId(senderId);
        sender.setFullName("Member Sender");

        message = new ChatMessage();
        message.setId(UUID.randomUUID());
        message.setChannel(channel);
        message.setSender(sender);
        message.setSenderType(ChatSenderType.USER);
        message.setContent("Tin nhắn không phù hợp");
        message.setDeliveryStatus(ChatMessageStatus.SENT);
        message.setCreatedAt(OffsetDateTime.now(clock));
    }

    @Test
    void moderatorCanDeleteAnotherUsersMessageAndBroadcastRealtime() {
        when(channelRepository.findWithRelationsById(channelId)).thenReturn(Optional.of(channel));
        when(messageRepository.findWithRelationsById(message.getId())).thenReturn(Optional.of(message));
        when(chatAccessPolicy.canModerateMessages(new Actor(moderatorId), channel)).thenReturn(true);
        when(membershipRepository.findActiveUserIdsByClubId(clubId)).thenReturn(List.of(senderId, moderatorId));

        service.deleteMessage(new Actor(moderatorId), channelId, message.getId());

        verify(messageRepository).clearReplyReferences(message.getId());
        verify(chatMediaService).deleteAttachmentsForMessage(message.getId());
        verify(messageRepository).deleteById(message.getId());
        verify(auditService).record(eq(moderatorId), eq(AuditAction.CHAT_MESSAGE_DELETED), eq(channelId), eq(clubId), any(), eq(null));

        ArgumentCaptor<ChatRealtimeEvent> evtCap = ArgumentCaptor.forClass(ChatRealtimeEvent.class);
        verify(eventPublisher).publishEvent(evtCap.capture());
        assertEquals("MESSAGE_DELETED", evtCap.getValue().type());
        assertEquals(message.getId(), evtCap.getValue().message().id());
    }

    @Test
    void regularMemberCannotDeleteAnotherUsersMessage() {
        when(channelRepository.findWithRelationsById(channelId)).thenReturn(Optional.of(channel));
        when(messageRepository.findWithRelationsById(message.getId())).thenReturn(Optional.of(message));
        when(chatAccessPolicy.canModerateMessages(new Actor(strangerId), channel)).thenReturn(false);

        ApiException ex = assertThrows(ApiException.class,
                () -> service.deleteMessage(new Actor(strangerId), channelId, message.getId()));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    void senderCanUpdateOwnMessageContentAndStampEditedAt() {
        when(chatAccessPolicy.requireChannelAccessById(new Actor(senderId), channelId, "chat.send", true)).thenReturn(channel);
        when(messageRepository.findWithRelationsById(message.getId())).thenReturn(Optional.of(message));
        when(messageRepository.saveAndFlush(any(ChatMessage.class))).thenAnswer(inv -> inv.getArgument(0));
        when(chatMediaService.enrichMessages(any())).thenAnswer(inv -> inv.getArgument(0));
        when(membershipRepository.findActiveUserIdsByClubId(clubId)).thenReturn(List.of(senderId));

        ChatMessageResponse updated = service.updateMessage(
                new Actor(senderId), channelId, message.getId(), new UpdateChatMessageRequest("Nội dung đã chỉnh sửa lịch sự"));

        assertEquals("Nội dung đã chỉnh sửa lịch sự", updated.content());
        assertNotNull(updated.editedAt());
        verify(auditService).record(eq(senderId), eq(AuditAction.CHAT_MESSAGE_UPDATED), eq(channelId), eq(clubId), any(), any());
    }

    @Test
    void clubManagerCanDeleteChannelAndBroadcastChannelDeleted() {
        when(channelRepository.findWithRelationsById(channelId)).thenReturn(Optional.of(channel));
        when(chatAccessPolicy.canManageChannel(new Actor(moderatorId), channel)).thenReturn(true);
        when(membershipRepository.findActiveUserIdsByClubId(clubId)).thenReturn(List.of(senderId, moderatorId));

        service.deleteChannel(new Actor(moderatorId), clubId, channelId);

        verify(chatMediaService).deleteAttachmentsForChannel(channelId);
        verify(channelRepository).delete(channel);
        verify(auditService).record(eq(moderatorId), eq(AuditAction.CHAT_CHANNEL_DELETED), eq(channelId), eq(clubId), any(), eq(null));

        ArgumentCaptor<ChatRealtimeEvent> evtCap = ArgumentCaptor.forClass(ChatRealtimeEvent.class);
        verify(eventPublisher).publishEvent(evtCap.capture());
        assertEquals("CHANNEL_DELETED", evtCap.getValue().type());
        ChatChannelResponse chResp = evtCap.getValue().channel();
        assertNotNull(chResp);
        assertEquals(channelId, chResp.id());
    }
}
