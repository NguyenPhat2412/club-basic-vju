package com.vju.club.controller;

import com.vju.club.annotation.PublicEndpoint;
import com.vju.club.common.ApiPaths;
import com.vju.club.dto.request.CreateClubPostRequest;
import com.vju.club.dto.request.UpdateClubPostRequest;
import com.vju.club.dto.response.ClubFollowStatusResponse;
import com.vju.club.dto.response.ClubPostLikeResponse;
import com.vju.club.dto.response.ClubPostResponse;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.security.Actor;
import com.vju.club.security.SecurityIdentity;
import com.vju.club.service.ClubPageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
@Tag(name = "Club Page", description = "Bảng tin bài viết CLB (ghim bài, thả tim) và theo dõi câu lạc bộ")
public class ClubPageController {
    private final ClubPageService service;

    @PublicEndpoint
    @GetMapping(ApiPaths.PUBLIC_CLUB_POSTS)
    @Operation(summary = "Danh sách bài viết trên bảng tin CLB (công khai)")
    public PageResponse<ClubPostResponse> listPosts(
            @PathVariable UUID clubId,
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit) {
        UUID viewerId = SecurityIdentity.currentUserId(SecurityContextHolder.getContext().getAuthentication()).orElse(null);
        return service.listPublicPosts(clubId, viewerId, offset, limit);
    }

    @PostMapping(ApiPaths.CLUB_POSTS)
    @Operation(summary = "Đăng bài viết mới lên bảng tin CLB")
    public ResponseEntity<ClubPostResponse> createPost(
            Actor actor,
            @PathVariable UUID clubId,
            @Valid @RequestBody CreateClubPostRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createPost(actor, clubId, request));
    }

    @PatchMapping(ApiPaths.CLUB_POST_BY_ID)
    @Operation(summary = "Chỉnh sửa hoặc ghim / bỏ ghim bài viết CLB")
    public ClubPostResponse updatePost(
            Actor actor,
            @PathVariable UUID clubId,
            @PathVariable UUID postId,
            @Valid @RequestBody UpdateClubPostRequest request) {
        return service.updatePost(actor, clubId, postId, request);
    }

    @DeleteMapping(ApiPaths.CLUB_POST_BY_ID)
    @Operation(summary = "Xoá bài viết trên bảng tin CLB")
    public ResponseEntity<Void> deletePost(
            Actor actor,
            @PathVariable UUID clubId,
            @PathVariable UUID postId) {
        service.deletePost(actor, clubId, postId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(ApiPaths.CLUB_POST_LIKE)
    @Operation(summary = "Thả tim / bỏ tim bài viết CLB")
    public ClubPostLikeResponse toggleLike(
            Actor actor,
            @PathVariable UUID clubId,
            @PathVariable UUID postId) {
        return service.toggleLike(actor, clubId, postId);
    }

    @PublicEndpoint
    @GetMapping(ApiPaths.PUBLIC_CLUB_FOLLOW_STATUS)
    @Operation(summary = "Trạng thái theo dõi & tổng số người theo dõi CLB (công khai)")
    public ClubFollowStatusResponse getFollowStatus(@PathVariable UUID clubId) {
        UUID viewerId = SecurityIdentity.currentUserId(SecurityContextHolder.getContext().getAuthentication()).orElse(null);
        return service.getFollowStatus(clubId, viewerId);
    }

    @PutMapping(ApiPaths.CLUB_FOLLOW)
    @Operation(summary = "Theo dõi / bỏ theo dõi câu lạc bộ")
    public ClubFollowStatusResponse toggleFollow(Actor actor, @PathVariable UUID clubId) {
        return service.toggleFollow(actor, clubId);
    }
}
