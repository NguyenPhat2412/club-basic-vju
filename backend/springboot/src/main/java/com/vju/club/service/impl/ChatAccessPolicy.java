package com.vju.club.service.impl;

import com.vju.club.common.ChatConstants;
import com.vju.club.entity.ChatChannel;
import com.vju.club.enums.ClubStatus;
import com.vju.club.enums.MembershipStatus;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ChatChannelRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ChatAccessPolicy {
    private final ChatChannelRepository channelRepository;
    private final MembershipRepository membershipRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final PermissionAuthorizationService authorizationService;

    @Transactional(readOnly = true)
    public ChatChannel requireChannelAccessById(Actor actor, UUID channelId, String permissionKey, boolean write) {
        ChatChannel channel = channelRepository.findWithRelationsById(channelId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CHANNEL_NOT_FOUND", "Chat channel not found"));
        requireChannelAccess(actor, channel, permissionKey, write);
        return channel;
    }

    public void requireChannelAccess(Actor actor, ChatChannel channel, String permissionKey, boolean write) {
        UUID clubId = channel.getClub().getId();
        if (write && channel.getClub().getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
        UUID deptId = channel.getDepartment() != null ? channel.getDepartment().getId() : null;
        if (authorizationService.hasPermission(actor, permissionKey, clubId, deptId)) {
            return;
        }
        if (ChatConstants.PERMISSION_SUMMARIZE.equals(permissionKey) || !canSeeAsMember(actor, channel)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
    }

    public boolean isActiveMember(Actor actor, UUID clubId) {
        return membershipRepository.existsByUser_IdAndClub_IdAndStatus(actor.id(), clubId, MembershipStatus.ACTIVE);
    }

    public boolean canSeeAsMember(Actor actor, ChatChannel channel) {
        if (!isActiveMember(actor, channel.getClub().getId())) {
            return false;
        }
        return channel.getDepartment() == null
                || departmentMemberRepository.isUserInDepartment(channel.getDepartment().getId(), actor.id());
    }
}
