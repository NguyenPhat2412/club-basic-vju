package com.vju.club.service;

import com.vju.club.dto.request.CreateNotificationCampaignRequest;
import com.vju.club.dto.response.NotificationCampaignRemindResponse;
import com.vju.club.dto.response.NotificationCampaignResponse;
import com.vju.club.entity.NotificationCampaign;
import com.vju.club.enums.AuditAction;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DocumentRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.NotificationCampaignRepository;
import com.vju.club.repository.NotificationRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.repository.UserRoleRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.impl.NotificationCampaignServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationCampaignServiceTest {
    @Mock NotificationCampaignRepository campaignRepository;
    @Mock NotificationRepository notificationRepository;
    @Mock UserRepository userRepository;
    @Mock UserRoleRepository userRoleRepository;
    @Mock MembershipRepository membershipRepository;
    @Mock ClubRepository clubRepository;
    @Mock DocumentRepository documentRepository;
    @Mock PermissionAuthorizationService authorizationService;
    @Mock AuditService auditService;
    @Mock JdbcTemplate jdbcTemplate;

    private final Clock fixedClock = Clock.fixed(Instant.parse("2026-11-28T03:30:00Z"), ZoneOffset.UTC);
    private NotificationCampaignService service;

    @BeforeEach
    void setUp() {
        service = new NotificationCampaignServiceImpl(
                campaignRepository,
                notificationRepository,
                userRepository,
                userRoleRepository,
                membershipRepository,
                clubRepository,
                documentRepository,
                authorizationService,
                auditService,
                jdbcTemplate,
                fixedClock);
    }

    @Test
    void createCampaignBatchDeliversInChunksOf200AndRecordsAudit() {
        Actor admin = new Actor(UUID.randomUUID());
        List<UUID> recipients = java.util.stream.IntStream.range(0, 450).mapToObj(i -> UUID.randomUUID()).toList();
        when(userRepository.findAllActiveUserIds()).thenReturn(recipients);
        when(campaignRepository.saveAndFlush(any(NotificationCampaign.class))).thenAnswer(inv -> {
            NotificationCampaign c = inv.getArgument(0);
            if (c.getId() == null) c.setId(UUID.randomUUID());
            if (c.getCreatedAt() == null) c.setCreatedAt(OffsetDateTime.ofInstant(fixedClock.instant(), ZoneOffset.UTC));
            return c;
        });
        when(userRepository.findById(admin.id())).thenReturn(Optional.empty());

        NotificationCampaignResponse result = service.createAndSend(admin, new CreateNotificationCampaignRequest(
                "Thông báo nộp hồ sơ học kỳ",
                "Các CLB hoàn thiện hồ sơ trước ngày 30/11.",
                "ALL_USERS",
                null,
                "DOCUMENT",
                null,
                false));

        assertThat(result.totalRecipients()).isEqualTo(450);
        assertThat(result.deliveredCount()).isEqualTo(450);
        assertThat(result.status()).isEqualTo("COMPLETED");
        // 450 recipients -> 3 batches (200 + 200 + 50)
        verify(jdbcTemplate, times(3)).batchUpdate(anyString(), anyList());
        verify(auditService).record(eq(admin.id()), eq(AuditAction.NOTIFICATION_BROADCASTED), eq(result.id()), eq(null), eq(null), any());
    }

    @Test
    void remindUnreadTargetsOnlyUnreadRecipients() {
        Actor admin = new Actor(UUID.randomUUID());
        UUID campaignId = UUID.randomUUID();
        NotificationCampaign campaign = new NotificationCampaign();
        campaign.setId(campaignId);
        campaign.setTitle("Hạn nộp kế hoạch CLB");
        campaign.setMessage("Vui lòng nộp trước 17h.");
        campaign.setCategory("DOCUMENT");
        campaign.setCreatedBy(admin.id());

        when(campaignRepository.findById(campaignId)).thenReturn(Optional.of(campaign));
        when(authorizationService.hasPermission(admin, "notification.send", null, null)).thenReturn(true);
        when(notificationRepository.findUnreadUserIdsByCampaignId(campaignId))
                .thenReturn(List.of(UUID.randomUUID(), UUID.randomUUID()));

        NotificationCampaignRemindResponse res = service.remindUnread(admin, campaignId);
        assertThat(res.remindedCount()).isEqualTo(2);
        verify(jdbcTemplate, times(1)).batchUpdate(anyString(), anyList());
    }
}
