package com.vju.club.service.impl;

import com.vju.club.dto.response.NotificationRealtimeEvent;
import com.vju.club.dto.response.NotificationResponse;
import com.vju.club.entity.User;
import com.vju.club.repository.UserRepository;
import com.vju.club.service.OtpMailService;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
@RequiredArgsConstructor
public class NotificationEmailListener {
    private static final Set<String> EMAIL_WORTHY_TYPES = Set.of(
            "CLUB_APPLICATION",
            "DEPARTMENT",
            "TASK",
            "EVENT",
            "CLUB",
            "DOCUMENT",
            "SYSTEM"
    );

    private final OtpMailService otpMailService;
    private final UserRepository userRepository;

    @Autowired(required = false)
    @Qualifier("mailTaskExecutor")
    private Executor mailTaskExecutor;

    private ExecutorService fallbackPool;
    private ExecutorService bulkCampaignPool;

    private synchronized Executor resolveExecutor() {
        if (mailTaskExecutor != null) return mailTaskExecutor;
        if (fallbackPool == null) {
            fallbackPool = new ThreadPoolExecutor(
                    1, 2, 60L, TimeUnit.SECONDS,
                    new ArrayBlockingQueue<>(4096),
                    r -> {
                        Thread t = new Thread(r, "vju-notif-mail-fallback");
                        t.setDaemon(true);
                        return t;
                    },
                    new ThreadPoolExecutor.CallerRunsPolicy());
        }
        return fallbackPool;
    }

    private synchronized ExecutorService resolveBulkPool() {
        if (bulkCampaignPool == null) {
            bulkCampaignPool = new ThreadPoolExecutor(
                    1, 1, 60L, TimeUnit.SECONDS,
                    new ArrayBlockingQueue<>(256),
                    r -> {
                        Thread t = new Thread(r, "vju-notif-campaign-mail");
                        t.setDaemon(true);
                        return t;
                    },
                    new ThreadPoolExecutor.DiscardOldestPolicy());
        }
        return bulkCampaignPool;
    }

    public int enqueueCampaignEmails(java.util.List<User> recipients, String title, String message, String category) {
        if (recipients == null || recipients.isEmpty() || !otpMailService.isMailConfigured()) {
            return 0;
        }
        record RecipientTarget(String email, String fullName) { }
        java.util.List<RecipientTarget> eligible = recipients.stream()
                .filter(User::isEmailNotificationsEnabled)
                .filter(u -> u.getEmail() != null && !u.getEmail().isBlank()
                        && !u.getEmail().endsWith(".local") && !u.getEmail().endsWith(".test"))
                .map(u -> new RecipientTarget(u.getEmail(), u.getFullName()))
                .toList();
        if (eligible.isEmpty()) {
            return 0;
        }
        resolveBulkPool().execute(() -> {
            for (RecipientTarget target : eligible) {
                try {
                    otpMailService.sendNotificationAlertEmail(target.email(), target.fullName(), title, message, category);
                    Thread.sleep(25L);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (RuntimeException ex) {
                    log.warn("Failed to deliver campaign email to {}: {}", target.email(), ex.getMessage());
                }
            }
        });
        return eligible.size();
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNotificationCreated(NotificationRealtimeEvent event) {
        if (event == null || !"NOTIFICATION_CREATED".equals(event.type()) || event.userId() == null) {
            return;
        }
        NotificationResponse notif = event.notification();
        if (notif == null || notif.referenceType() == null || !EMAIL_WORTHY_TYPES.contains(notif.referenceType())) {
            return;
        }
        if (!otpMailService.isMailConfigured()) {
            return;
        }

        Optional<User> userOpt = userRepository.findById(event.userId());
        if (userOpt.isEmpty()) {
            return;
        }
        User recipient = userOpt.get();
        if (!recipient.isEmailNotificationsEnabled()) {
            return;
        }
        String email = recipient.getEmail();
        String fullName = recipient.getFullName();
        if (email == null || email.isBlank() || email.endsWith(".local") || email.endsWith(".test")) {
            return;
        }

        resolveExecutor().execute(() -> otpMailService.sendNotificationAlertEmail(
                email, fullName, notif.title(), notif.message(), notif.referenceType()));
    }

    @PreDestroy
    void shutdown() {
        if (fallbackPool != null) {
            fallbackPool.shutdown();
        }
        if (bulkCampaignPool != null) {
            bulkCampaignPool.shutdown();
        }
    }
}
