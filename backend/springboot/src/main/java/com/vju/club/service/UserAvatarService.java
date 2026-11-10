package com.vju.club.service;

import com.vju.club.dto.record.ClubMediaContent;
import com.vju.club.dto.record.UploadedFile;
import com.vju.club.dto.response.UserResponse;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface UserAvatarService {
    UserResponse uploadMine(Actor actor, UploadedFile file);

    UserResponse uploadForUser(Actor actor, UUID userId, UploadedFile file);

    ClubMediaContent open(String fileName);
}
