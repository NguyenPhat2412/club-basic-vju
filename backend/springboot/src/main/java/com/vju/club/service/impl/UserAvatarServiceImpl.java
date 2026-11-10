package com.vju.club.service.impl;

import com.vju.club.annotation.RequirePermission;
import com.vju.club.common.ApiPaths;
import com.vju.club.common.UserConstants;
import com.vju.club.dto.record.ClubMediaContent;
import com.vju.club.dto.record.UploadedFile;
import com.vju.club.dto.request.AdminUpdateUserRequest;
import com.vju.club.dto.request.UpdateProfileRequest;
import com.vju.club.dto.response.UserResponse;
import com.vju.club.entity.User;
import com.vju.club.error.ApiException;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.service.UserAvatarService;
import com.vju.club.service.UserService;
import com.vju.club.storage.DocumentStorage;
import com.vju.club.storage.ImageUploads;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Pattern;

/**
 * Avatars live in object storage under avatars/{userId}-{random}.{ext}; the public URL carries that file name,
 * so no extra column is needed. Profile changes go through UserService to keep its permission, admin-guard and audit rules.
 */
@Service
public class UserAvatarServiceImpl implements UserAvatarService {
    private static final String KEY_PREFIX = "avatars/";
    private static final Pattern FILE_NAME = Pattern.compile(
            "^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}-[0-9a-f]{32}\\.(png|jpg|gif|webp)$");

    private final UserService userService;
    private final UserRepository userRepository;
    private final DocumentStorage documentStorage;
    private final com.vju.club.service.SystemSettingsService settingsService;
    private final String publicApiBaseUrl;

    public UserAvatarServiceImpl(UserService userService, UserRepository userRepository, DocumentStorage documentStorage,
                                 com.vju.club.service.SystemSettingsService settingsService,
                                 @Value("${app.public-api-base-url:http://localhost:${server.port:8080}}") String publicApiBaseUrl) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.documentStorage = documentStorage;
        this.settingsService = settingsService;
        this.publicApiBaseUrl = publicApiBaseUrl.endsWith("/")
                ? publicApiBaseUrl.substring(0, publicApiBaseUrl.length() - 1) : publicApiBaseUrl;
    }

    @Override
    public UserResponse uploadMine(Actor actor, UploadedFile file) {
        return store(actor.id(), file, url -> userService.updateProfile(actor, new UpdateProfileRequest(null, null, url)));
    }

    @Override
    @RequirePermission(UserConstants.PERMISSION_UPDATE)
    public UserResponse uploadForUser(Actor actor, UUID userId, UploadedFile file) {
        return store(userId, file, url -> userService.updateUser(actor, userId, new AdminUpdateUserRequest(null, null, null, url)));
    }

    @Override
    public ClubMediaContent open(String fileName) {
        if (fileName == null || !FILE_NAME.matcher(fileName).matches()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "AVATAR_NOT_FOUND", "Avatar not found");
        }
        DocumentStorage.StoredObject stored;
        try {
            stored = documentStorage.open(KEY_PREFIX + fileName);
        } catch (RuntimeException missing) {
            throw new ApiException(HttpStatus.NOT_FOUND, "AVATAR_NOT_FOUND", "Avatar not found");
        }
        String ext = fileName.substring(fileName.lastIndexOf('.') + 1);
        String contentType = "jpg".equals(ext) ? "image/jpeg" : "image/" + ext;
        return new ClubMediaContent(fileName, contentType, stored.size(), stored.content());
    }

    private UserResponse store(UUID userId, UploadedFile file, Function<String, UserResponse> saveUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        String previousUrl = user.getAvatarUrl();
        ImageUploads.ValidatedImage image = ImageUploads.read(file, settingsService.current().avatarMaxMb() * 1024L * 1024);
        String fileName = userId + "-" + UUID.randomUUID().toString().replace("-", "") + image.extension();
        documentStorage.put(KEY_PREFIX + fileName, new ByteArrayInputStream(image.bytes()), image.bytes().length, image.contentType());
        UserResponse saved;
        try {
            saved = saveUrl.apply(publicApiBaseUrl + ApiPaths.publicAvatarPath(fileName));
        } catch (RuntimeException rejected) {
            deleteQuietly(KEY_PREFIX + fileName);
            throw rejected;
        }
        String previousFile = ownFileName(previousUrl);
        if (previousFile != null && previousFile.startsWith(userId.toString())) deleteQuietly(KEY_PREFIX + previousFile);
        return saved;
    }

    private String ownFileName(String url) {
        String prefix = publicApiBaseUrl + ApiPaths.publicAvatarPath("");
        if (url == null || !url.startsWith(prefix)) return null;
        String name = url.substring(prefix.length());
        return FILE_NAME.matcher(name).matches() ? name : null;
    }

    private void deleteQuietly(String key) {
        try {
            documentStorage.delete(key);
        } catch (RuntimeException ignored) {
            // orphaned object only costs storage; never fail the user's request for it
        }
    }
}
