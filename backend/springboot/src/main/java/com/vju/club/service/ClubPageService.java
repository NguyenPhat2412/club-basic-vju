package com.vju.club.service;

import com.vju.club.dto.request.CreateClubPostRequest;
import com.vju.club.dto.request.UpdateClubPostRequest;
import com.vju.club.dto.response.ClubFollowStatusResponse;
import com.vju.club.dto.response.ClubPostLikeResponse;
import com.vju.club.dto.response.ClubPostResponse;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.security.Actor;
import org.springframework.lang.Nullable;

import java.util.UUID;

public interface ClubPageService {
    PageResponse<ClubPostResponse> listPublicPosts(UUID clubId, @Nullable UUID viewerUserId, int offset, int limit);

    ClubPostResponse createPost(Actor actor, UUID clubId, CreateClubPostRequest request);

    ClubPostResponse updatePost(Actor actor, UUID clubId, UUID postId, UpdateClubPostRequest request);

    void deletePost(Actor actor, UUID clubId, UUID postId);

    ClubPostLikeResponse toggleLike(Actor actor, UUID clubId, UUID postId);

    ClubFollowStatusResponse getFollowStatus(UUID clubId, @Nullable UUID viewerUserId);

    ClubFollowStatusResponse toggleFollow(Actor actor, UUID clubId);
}
