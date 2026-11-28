package com.vju.club.service.impl;

import com.vju.club.annotation.RequirePermission;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.dto.request.CreateClubPostRequest;
import com.vju.club.dto.request.UpdateClubPostRequest;
import com.vju.club.dto.response.ClubFollowStatusResponse;
import com.vju.club.dto.response.ClubPostLikeResponse;
import com.vju.club.dto.response.ClubPostResponse;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.ClubFollower;
import com.vju.club.entity.ClubPost;
import com.vju.club.entity.ClubPostLike;
import com.vju.club.entity.User;
import com.vju.club.enums.AuditAction;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ClubFollowerRepository;
import com.vju.club.repository.ClubPostLikeRepository;
import com.vju.club.repository.ClubPostRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.service.AuditService;
import com.vju.club.service.ClubPageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClubPageServiceImpl implements ClubPageService {
    private static final String PERMISSION_CLUB_UPDATE = "club.update";

    private final ClubRepository clubRepository;
    private final ClubPostRepository postRepository;
    private final ClubPostLikeRepository postLikeRepository;
    private final ClubFollowerRepository followerRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ClubPostResponse> listPublicPosts(UUID clubId, @Nullable UUID viewerUserId, int offset, int limit) {
        Club club = requireClub(clubId);
        var pageable = new OffsetLimitRequest(offset, limit, Sort.by(Sort.Order.desc("pinned"), Sort.Order.desc("createdAt")));
        Page<ClubPost> page = postRepository.findByClubIdOrderByPinnedDescCreatedAtDesc(clubId, pageable);
        List<ClubPost> posts = page.getContent();
        if (posts.isEmpty()) {
            return new PageResponse<>(List.of(), page.getTotalElements(), offset, limit);
        }

        Set<UUID> authorIds = posts.stream().map(ClubPost::getAuthorId).collect(Collectors.toSet());
        Map<UUID, User> authors = new HashMap<>();
        userRepository.findAllById(authorIds).forEach(u -> authors.put(u.getId(), u));

        Set<UUID> likedPostIds = new HashSet<>();
        if (viewerUserId != null) {
            List<UUID> postIds = posts.stream().map(ClubPost::getId).toList();
            likedPostIds.addAll(postLikeRepository.findLikedPostIds(viewerUserId, postIds));
        }

        List<ClubPostResponse> items = posts.stream()
                .map(p -> toResponse(p, club, authors.get(p.getAuthorId()), likedPostIds.contains(p.getId())))
                .toList();
        return new PageResponse<>(items, page.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional
    @RequirePermission(value = PERMISSION_CLUB_UPDATE, clubId = "clubId")
    public ClubPostResponse createPost(Actor actor, UUID clubId, CreateClubPostRequest request) {
        Club club = requireClub(clubId);
        String content = request.content() == null ? "" : request.content().trim();
        if (content.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Post content is required");
        }
        String imageUrl = sanitizeImageUrl(request.imageUrl());

        ClubPost post = new ClubPost();
        post.setId(UUID.randomUUID());
        post.setClubId(club.getId());
        post.setAuthorId(actor.id());
        post.setTitle(blankToNull(request.title()));
        post.setContent(content);
        post.setImageUrl(imageUrl);
        post.setPinned(Boolean.TRUE.equals(request.pinned()));
        post.setLikesCount(0);
        ClubPost saved = postRepository.saveAndFlush(post);

        Map<String, Object> audit = new LinkedHashMap<>();
        audit.put("subAction", "CLUB_POST_CREATED");
        audit.put("postId", saved.getId());
        audit.put("pinned", saved.isPinned());
        if (saved.getTitle() != null) audit.put("title", saved.getTitle());
        auditService.record(actor.id(), AuditAction.CLUB_UPDATED, club.getId(), club.getId(), null, audit);

        User author = userRepository.findById(actor.id()).orElse(null);
        return toResponse(saved, club, author, false);
    }

    @Override
    @Transactional
    @RequirePermission(value = PERMISSION_CLUB_UPDATE, clubId = "clubId")
    public ClubPostResponse updatePost(Actor actor, UUID clubId, UUID postId, UpdateClubPostRequest request) {
        Club club = requireClub(clubId);
        ClubPost post = postRepository.findByIdAndClubId(postId, clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_POST_NOT_FOUND", "Club post not found"));

        if (request.title() != null) {
            post.setTitle(blankToNull(request.title()));
        }
        if (request.content() != null) {
            String trimmed = request.content().trim();
            if (trimmed.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Post content cannot be blank");
            }
            post.setContent(trimmed);
        }
        if (request.imageUrl() != null) {
            post.setImageUrl(sanitizeImageUrl(request.imageUrl()));
        }
        if (request.pinned() != null) {
            post.setPinned(request.pinned());
        }

        ClubPost saved = postRepository.saveAndFlush(post);
        auditService.record(actor.id(), AuditAction.CLUB_UPDATED, club.getId(), club.getId(), null,
                Map.of("subAction", "CLUB_POST_UPDATED", "postId", saved.getId(), "pinned", saved.isPinned()));

        User author = userRepository.findById(saved.getAuthorId()).orElse(null);
        boolean likedByMe = postLikeRepository.existsByPostIdAndUserId(saved.getId(), actor.id());
        return toResponse(saved, club, author, likedByMe);
    }

    @Override
    @Transactional
    @RequirePermission(value = PERMISSION_CLUB_UPDATE, clubId = "clubId")
    public void deletePost(Actor actor, UUID clubId, UUID postId) {
        Club club = requireClub(clubId);
        ClubPost post = postRepository.findByIdAndClubId(postId, clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_POST_NOT_FOUND", "Club post not found"));
        postRepository.delete(post);
        postRepository.flush();
        auditService.record(actor.id(), AuditAction.CLUB_UPDATED, club.getId(), club.getId(),
                Map.of("subAction", "CLUB_POST_DELETED", "postId", postId), null);
    }

    @Override
    @Transactional
    public ClubPostLikeResponse toggleLike(Actor actor, UUID clubId, UUID postId) {
        requireClub(clubId);
        ClubPost post = postRepository.findByIdAndClubId(postId, clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_POST_NOT_FOUND", "Club post not found"));
        boolean liked;
        if (postLikeRepository.existsByPostIdAndUserId(postId, actor.id())) {
            postLikeRepository.deleteByPostIdAndUserId(postId, actor.id());
            postLikeRepository.flush();
            liked = false;
        } else {
            postLikeRepository.saveAndFlush(new ClubPostLike(postId, actor.id()));
            liked = true;
        }
        int likesCount = postLikeRepository.countByPostId(postId);
        post.setLikesCount(likesCount);
        postRepository.saveAndFlush(post);
        return new ClubPostLikeResponse(postId, liked, likesCount);
    }

    @Override
    @Transactional(readOnly = true)
    public ClubFollowStatusResponse getFollowStatus(UUID clubId, @Nullable UUID viewerUserId) {
        requireClub(clubId);
        long count = followerRepository.countByClubId(clubId);
        boolean following = viewerUserId != null && followerRepository.existsByClubIdAndUserId(clubId, viewerUserId);
        return new ClubFollowStatusResponse(clubId, following, count);
    }

    @Override
    @Transactional
    public ClubFollowStatusResponse toggleFollow(Actor actor, UUID clubId) {
        requireClub(clubId);
        boolean following;
        if (followerRepository.existsByClubIdAndUserId(clubId, actor.id())) {
            followerRepository.deleteByClubIdAndUserId(clubId, actor.id());
            followerRepository.flush();
            following = false;
        } else {
            followerRepository.saveAndFlush(new ClubFollower(clubId, actor.id()));
            following = true;
        }
        long count = followerRepository.countByClubId(clubId);
        return new ClubFollowStatusResponse(clubId, following, count);
    }

    private Club requireClub(UUID clubId) {
        return clubRepository.findById(clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
    }

    private static String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String sanitizeImageUrl(String raw) {
        String trimmed = blankToNull(raw);
        if (trimmed == null) return null;
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (lower.startsWith("https://") || lower.startsWith("http://") || lower.startsWith("/images/") || lower.startsWith("/api/v1/")) {
            return trimmed;
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Image URL must be an HTTP(S) or site-relative image path");
    }

    private static ClubPostResponse toResponse(ClubPost p, Club club, @Nullable User author, boolean likedByMe) {
        return new ClubPostResponse(
                p.getId(),
                club.getId(),
                club.getName(),
                club.getCode(),
                p.getAuthorId(),
                author != null ? author.getFullName() : club.getName(),
                author != null ? author.getAvatarUrl() : null,
                p.getTitle(),
                p.getContent(),
                p.getImageUrl(),
                p.isPinned(),
                p.getLikesCount(),
                likedByMe,
                p.getCreatedAt(),
                p.getUpdatedAt());
    }
}
