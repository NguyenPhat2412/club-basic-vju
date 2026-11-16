package com.vju.club.service.impl;

import com.vju.club.dto.response.NotificationRealtimeEvent;
import com.vju.club.dto.response.NotificationResponse;
import com.vju.club.dto.response.NotificationUnreadSummaryResponse;
import com.vju.club.entity.ChatChannel;
import com.vju.club.entity.ChatMessage;
import com.vju.club.entity.Club;
import com.vju.club.entity.Notification;
import com.vju.club.entity.User;
import com.vju.club.enums.UserStatus;
import com.vju.club.mapper.NotificationMapperImpl;
import com.vju.club.repository.ChatChannelRepository;
import com.vju.club.repository.ChatMessageRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.repository.EventRegistrationRepository;
import com.vju.club.repository.EventRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.NotificationRepository;
import com.vju.club.repository.TaskRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.repository.UserRoleRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.websocket.ActorPrincipal;
import com.vju.club.security.websocket.ChatStompChannelInterceptor;
import com.vju.club.service.AuditService;
import com.vju.club.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationRealtimeAndChatUnitTest {

    @Test
    void notificationServicePublishesRealtimeEventEnrichesChatClubIdAndComputesUnreadSummary() {
        NotificationRepository notifRepo = mock(NotificationRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        ChatChannelRepository channelRepo = mock(ChatChannelRepository.class);
        ChatMessageRepository msgRepo = mock(ChatMessageRepository.class);
        ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);

        NotificationServiceImpl service = new NotificationServiceImpl(
                notifRepo,
                userRepo,
                mock(ClubRepository.class),
                mock(DepartmentRepository.class),
                mock(MembershipRepository.class),
                mock(DepartmentMemberRepository.class),
                mock(EventRepository.class),
                mock(EventRegistrationRepository.class),
                mock(TaskRepository.class),
                mock(PermissionAuthorizationService.class),
                mock(AuditService.class),
                new NotificationMapperImpl()
        );
        ReflectionTestUtils.setField(service, "eventPublisher", publisher);
        ReflectionTestUtils.setField(service, "chatChannelRepository", channelRepo);
        ReflectionTestUtils.setField(service, "chatMessageRepository", msgRepo);
        ReflectionTestUtils.setField(service, "clock", Clock.fixed(Instant.parse("2026-11-16T08:00:00Z"), ZoneOffset.UTC));

        UUID userId = UUID.randomUUID();
        UUID clubId = UUID.randomUUID();
        UUID channelId = UUID.randomUUID();
        UUID notifId = UUID.randomUUID();

        User recipient = new User();
        ReflectionTestUtils.setField(recipient, "id", userId);
        Club club = new Club();
        ReflectionTestUtils.setField(club, "id", clubId);
        ChatChannel ch = new ChatChannel();
        ReflectionTestUtils.setField(ch, "id", channelId);
        ch.setClub(club);

        when(userRepo.findById(userId)).thenReturn(Optional.of(recipient));
        when(channelRepo.findById(channelId)).thenReturn(Optional.of(ch));
        when(notifRepo.countByUser_IdAndReadFalse(userId)).thenReturn(4L);
        when(notifRepo.saveAndFlush(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            ReflectionTestUtils.setField(n, "id", notifId);
            ReflectionTestUtils.setField(n, "createdAt", OffsetDateTime.parse("2026-11-16T08:00:00Z"));
            return n;
        });

        service.create(userId, "Trả lời tin nhắn", "Nội dung phản hồi", "CHAT", channelId, null);

        ArgumentCaptor<NotificationRealtimeEvent> evtCaptor = ArgumentCaptor.forClass(NotificationRealtimeEvent.class);
        verify(publisher).publishEvent(evtCaptor.capture());
        NotificationRealtimeEvent published = evtCaptor.getValue();
        assertThat(published.type()).isEqualTo("NOTIFICATION_CREATED");
        assertThat(published.userId()).isEqualTo(userId);
        assertThat(published.unreadCount()).isEqualTo(4L);
        assertThat(published.notification().clubId()).isEqualTo(clubId);

        ChatMessageRepository.UserUnreadChatRow unreadRow = new ChatMessageRepository.UserUnreadChatRow() {
            @Override public long getUnreadCount() { return 7L; }
            @Override public UUID getLatestClubId() { return clubId; }
            @Override public UUID getLatestChannelId() { return channelId; }
        };
        when(msgRepo.summarizeUserUnreadAcrossClubs(userId)).thenReturn(unreadRow);

        NotificationUnreadSummaryResponse summary = service.unreadSummary(new Actor(userId));
        assertThat(summary.unreadNotifications()).isEqualTo(4L);
        assertThat(summary.unreadChatMessages()).isEqualTo(7L);
        assertThat(summary.latestUnreadClubId()).isEqualTo(clubId);
        assertThat(summary.latestUnreadChannelId()).isEqualTo(channelId);
    }

    @Test
    void chatAndVaultNotifierNotifiesReplyAndMentionsWithoutDuplicatingRecipient() {
        NotificationService notifService = mock(NotificationService.class);
        UserRepository userRepo = mock(UserRepository.class);
        ChatAndVaultNotifier notifier = new ChatAndVaultNotifier(
                notifService,
                userRepo,
                mock(MembershipRepository.class),
                mock(DepartmentMemberRepository.class),
                mock(UserRoleRepository.class)
        );

        UUID senderId = UUID.randomUUID();
        UUID aliceId = UUID.randomUUID();
        UUID bobId = UUID.randomUUID();
        UUID channelId = UUID.randomUUID();

        User sender = new User();
        ReflectionTestUtils.setField(sender, "id", senderId);
        sender.setFullName("Nguyễn Văn B");

        User alice = new User();
        ReflectionTestUtils.setField(alice, "id", aliceId);
        alice.setFullName("Trần Thị Alice");

        Club club = new Club();
        club.setCode("SUNPINKEY");
        club.setName("CLB Bóng chuyền");

        ChatChannel channel = new ChatChannel();
        ReflectionTestUtils.setField(channel, "id", channelId);
        channel.setClub(club);
        channel.setName("thong-bao-chung");

        ChatMessage original = new ChatMessage();
        original.setSender(alice);

        ChatMessage replyMsg = new ChatMessage();
        UUID msgId = UUID.randomUUID();
        ReflectionTestUtils.setField(replyMsg, "id", msgId);

        // Reply to Alice AND @all -> Alice gets 1 reply notification, Bob gets 1 @all notification, sender gets 0
        notifier.notifyChatInteractions(
                channel,
                sender,
                replyMsg,
                "@all mọi người xem lịch tập nhé!",
                original,
                Set.of(senderId, aliceId, bobId),
                false
        );

        verify(notifService, times(1)).create(
                eq(aliceId), any(), any(), eq("CHAT"), eq(channelId), eq("CHAT_REPLY:" + msgId));
        verify(notifService, times(1)).create(
                eq(bobId), any(), any(), eq("CHAT"), eq(channelId), eq("CHAT_MENTION:" + msgId));
    }

    @Test
    void brokerAndStompInterceptorDeliverAndPermitUserNotificationQueue() {
        SimpMessagingTemplate template = mock(SimpMessagingTemplate.class);
        ChatRealtimeBroker broker = new ChatRealtimeBroker(
                template, null, "simple", Clock.fixed(Instant.parse("2026-11-16T08:00:00Z"), ZoneOffset.UTC));

        UUID userId = UUID.randomUUID();
        NotificationRealtimeEvent event = new NotificationRealtimeEvent(
                "NOTIFICATION_CREATED",
                userId,
                new NotificationResponse(UUID.randomUUID(), "T", "M", false, "TASK", UUID.randomUUID(), null, OffsetDateTime.now()),
                2L,
                OffsetDateTime.now()
        );
        broker.onNotificationEvent(event);
        verify(template).convertAndSendToUser(eq(userId.toString()), eq("/queue/notifications"), eq(event));

        UserRepository userRepo = mock(UserRepository.class);
        User activeUser = new User();
        ReflectionTestUtils.setField(activeUser, "id", userId);
        activeUser.setStatus(UserStatus.ACTIVE);
        when(userRepo.findById(userId)).thenReturn(Optional.of(activeUser));

        ChatStompChannelInterceptor interceptor = new ChatStompChannelInterceptor(mock(ChatAccessPolicy.class), userRepo);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/user/queue/notifications");
        accessor.setUser(new ActorPrincipal(userId, "User"));
        accessor.setLeaveMutable(true);
        Message<byte[]> msg = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThat(interceptor.preSend(msg, mock(MessageChannel.class))).isSameAs(msg);
    }
}
