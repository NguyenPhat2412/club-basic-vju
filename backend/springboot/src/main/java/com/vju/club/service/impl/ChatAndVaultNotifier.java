package com.vju.club.service.impl;

import com.vju.club.entity.ChatChannel;
import com.vju.club.entity.ChatMessage;
import com.vju.club.entity.Club;
import com.vju.club.entity.Department;
import com.vju.club.entity.Document;
import com.vju.club.entity.User;
import com.vju.club.enums.DocumentVisibility;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.repository.UserRoleRepository;
import com.vju.club.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class ChatAndVaultNotifier {
    private static final Pattern MENTION_ALL_RE = Pattern.compile(
            "(?iu)(?:^|\\s)@(?:all|everyone|tatca|tất\\s+cả|mọi\\s+người)(?=$|\\s|[.,!?;:])");

    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final UserRoleRepository userRoleRepository;

    public void notifyChatInteractions(ChatChannel channel, User sender, ChatMessage saved,
                                       String content, ChatMessage replyTo,
                                       Set<UUID> recipients, boolean hasMedia) {
        String preview = !content.isBlank() ? fit(content, 240) : (hasMedia ? "[Đính kèm hình ảnh / tệp tin]" : "");
        String channelLabel = "#" + channel.getName() + " (" + channel.getClub().getCode() + ")";
        Set<UUID> notified = new LinkedHashSet<>();

        if (replyTo != null && replyTo.getSender() != null && !replyTo.getSender().getId().equals(sender.getId())) {
            UUID targetId = replyTo.getSender().getId();
            notificationService.create(
                    targetId,
                    sender.getFullName() + " đã trả lời bạn tại " + channelLabel,
                    preview,
                    "CHAT",
                    channel.getId(),
                    "CHAT_REPLY:" + saved.getId()
            );
            notified.add(targetId);
        }

        if (!content.contains("@")) return;
        if (MENTION_ALL_RE.matcher(content).find()) {
            for (UUID uid : recipients) {
                if (uid.equals(sender.getId()) || notified.contains(uid)) continue;
                notificationService.create(
                        uid,
                        sender.getFullName() + " nhắc tất cả (@all) tại " + channelLabel,
                        preview,
                        "CHAT",
                        channel.getId(),
                        "CHAT_MENTION:" + saved.getId()
                );
                notified.add(uid);
            }
        } else if (!recipients.isEmpty()) {
            String lower = content.toLowerCase(Locale.ROOT);
            for (User u : userRepository.findAllById(recipients)) {
                if (u.getId().equals(sender.getId()) || notified.contains(u.getId())) continue;
                String handle = u.getEmail() != null && u.getEmail().contains("@")
                        ? "@" + u.getEmail().substring(0, u.getEmail().indexOf('@')).toLowerCase(Locale.ROOT)
                        : null;
                String fullTag = u.getFullName() != null && !u.getFullName().isBlank()
                        ? "@" + u.getFullName().strip().toLowerCase(Locale.ROOT)
                        : null;
                if ((handle != null && lower.contains(handle)) || (fullTag != null && lower.contains(fullTag))) {
                    notificationService.create(
                            u.getId(),
                            sender.getFullName() + " nhắc đến bạn tại " + channelLabel,
                            preview,
                            "CHAT",
                            channel.getId(),
                            "CHAT_MENTION:" + saved.getId()
                    );
                    notified.add(u.getId());
                }
            }
        }
    }

    public void notifyClubDocumentUploaded(UUID actorId, Club club, Department department,
                                           DocumentVisibility visibility, Document saved) {
        List<UUID> targets;
        if (department != null) {
            targets = departmentMemberRepository.findActiveUserIdsByDepartmentId(department.getId());
        } else if (visibility == DocumentVisibility.MEMBERS) {
            targets = membershipRepository.findActiveUserIdsByClubId(club.getId());
        } else {
            targets = userRoleRepository.findActiveLeadershipInClub(club.getId()).stream()
                    .filter(ur -> ur.getDepartment() == null)
                    .map(ur -> ur.getUser().getId())
                    .distinct()
                    .toList();
        }
        String unit = department != null ? department.getName() + " (" + club.getCode() + ")" : club.getName();
        String title = "Tài liệu mới tại " + unit;
        String body = "Tài liệu \"" + saved.getName() + "\" vừa được tải lên kho lưu trữ.";
        String eventKey = "DOC_UPLOADED:" + saved.getId();
        for (UUID uid : targets) {
            if (!uid.equals(actorId)) {
                notificationService.create(uid, title, body, "DOCUMENT", club.getId(), eventKey);
            }
        }
    }

    private static String fit(String text, int max) {
        return text.length() <= max ? text : text.substring(0, max - 1) + "…";
    }
}
