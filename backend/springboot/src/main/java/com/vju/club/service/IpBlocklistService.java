package com.vju.club.service;

import com.vju.club.dto.request.BlockIpRequest;
import com.vju.club.dto.response.BlockedIpResponse;
import com.vju.club.security.Actor;

import java.util.List;
import java.util.UUID;

public interface IpBlocklistService {
    boolean isBlocked(String ipAddress);

    List<BlockedIpResponse> listActive(Actor actor);

    BlockedIpResponse blockIp(Actor actor, BlockIpRequest request);

    void unblockIp(Actor actor, UUID ipId);
}
