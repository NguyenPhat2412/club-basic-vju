package com.vju.club.controller;

import com.vju.club.annotation.PublicEndpoint;
import com.vju.club.common.ApiPaths;
import com.vju.club.dto.record.ClubMediaContent;
import com.vju.club.dto.record.UploadedFile;
import com.vju.club.dto.response.UserResponse;
import com.vju.club.security.Actor;
import com.vju.club.service.UserAvatarService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
public class UserAvatarController {
    private final UserAvatarService avatarService;

    @PostMapping(value = ApiPaths.USERS_ME_AVATAR, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponse uploadMine(Actor actor, @RequestPart("file") MultipartFile file) {
        return avatarService.uploadMine(actor, new UploadedFile(file.getOriginalFilename(), file::getInputStream));
    }

    @PostMapping(value = ApiPaths.USER_AVATAR, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponse uploadForUser(Actor actor, @PathVariable UUID userId, @RequestPart("file") MultipartFile file) {
        return avatarService.uploadForUser(actor, userId, new UploadedFile(file.getOriginalFilename(), file::getInputStream));
    }

    @PublicEndpoint(reason = "Avatar images shown next to names; file names are unguessable")
    @GetMapping(ApiPaths.PUBLIC_AVATAR)
    public ResponseEntity<InputStreamResource> avatar(@PathVariable String fileName) {
        ClubMediaContent media = avatarService.open(fileName);
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(media.contentType()))
                // each upload gets a new file name, so the bytes behind a URL never change
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable")
                .header("X-Content-Type-Options", "nosniff");
        if (media.sizeBytes() != null && media.sizeBytes() > 0) builder.contentLength(media.sizeBytes());
        return builder.body(new InputStreamResource(media.content()));
    }
}
