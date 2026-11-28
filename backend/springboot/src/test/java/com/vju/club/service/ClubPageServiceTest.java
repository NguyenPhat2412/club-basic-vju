package com.vju.club.service;

import com.vju.club.dto.request.CreateClubPostRequest;
import com.vju.club.dto.request.UpdateClubPostRequest;
import com.vju.club.dto.response.ClubFollowStatusResponse;
import com.vju.club.dto.response.ClubPostLikeResponse;
import com.vju.club.dto.response.ClubPostResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.ClubFollower;
import com.vju.club.entity.ClubPost;
import com.vju.club.entity.ClubPostLike;
import com.vju.club.entity.User;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ClubFollowerRepository;
import com.vju.club.repository.ClubPostLikeRepository;
import com.vju.club.repository.ClubPostRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.service.impl.ClubPageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClubPageServiceTest {
    @Mock private ClubRepository clubRepository;
    @Mock private ClubPostRepository postRepository;
    @Mock private ClubPostLikeRepository postLikeRepository;
    @Mock private ClubFollowerRepository followerRepository;
    @Mock private UserRepository userRepository;
    @Mock private AuditService auditService;

    private ClubPageServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ClubPageServiceImpl(
                clubRepository, postRepository, postLikeRepository, followerRepository, userRepository, auditService);
    }

    @Test
    void createPostRejectsUnsafeImageSchemeAndSavesValidPost() {
        UUID clubId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Club club = new Club();
        club.setId(clubId);
        club.setCode("VAC");
        club.setName("VJU Art Club");
        when(clubRepository.findById(clubId)).thenReturn(Optional.of(club));

        assertThatThrownBy(() -> service.createPost(
                new Actor(userId), clubId, new CreateClubPostRequest("Hi", "Body", "javascript:alert(1)", false)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Image URL");

        User author = new User();
        author.setId(userId);
        author.setFullName("Nguyen Van A");
        when(postRepository.saveAndFlush(any(ClubPost.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(userId)).thenReturn(Optional.of(author));

        ClubPostResponse created = service.createPost(
                new Actor(userId), clubId,
                new CreateClubPostRequest("Mở đơn tuyển quân", "Chào đón tân sinh viên K2026!", "/images/clubs/vac/cover.jpg", true));
        assertThat(created.title()).isEqualTo("Mở đơn tuyển quân");
        assertThat(created.pinned()).isTrue();
        assertThat(created.authorName()).isEqualTo("Nguyen Van A");
    }

    @Test
    void toggleLikeAndToggleFollowUpdateCountsAccurately() {
        UUID clubId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Club club = new Club();
        club.setId(clubId);
        ClubPost post = new ClubPost();
        post.setId(postId);
        post.setClubId(clubId);

        when(clubRepository.findById(clubId)).thenReturn(Optional.of(club));
        when(postRepository.findByIdAndClubId(postId, clubId)).thenReturn(Optional.of(post));
        when(postLikeRepository.existsByPostIdAndUserId(postId, userId)).thenReturn(false);
        when(postLikeRepository.countByPostId(postId)).thenReturn(1);
        when(postRepository.saveAndFlush(any(ClubPost.class))).thenAnswer(inv -> inv.getArgument(0));

        ClubPostLikeResponse likeRes = service.toggleLike(new Actor(userId), clubId, postId);
        assertThat(likeRes.liked()).isTrue();
        assertThat(likeRes.likesCount()).isEqualTo(1);
        verify(postLikeRepository).saveAndFlush(any(ClubPostLike.class));

        when(followerRepository.existsByClubIdAndUserId(clubId, userId)).thenReturn(false);
        when(followerRepository.countByClubId(clubId)).thenReturn(12L);
        ClubFollowStatusResponse followRes = service.toggleFollow(new Actor(userId), clubId);
        assertThat(followRes.following()).isTrue();
        assertThat(followRes.followersCount()).isEqualTo(12L);
        verify(followerRepository).saveAndFlush(any(ClubFollower.class));

        when(postRepository.saveAndFlush(any(ClubPost.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(any())).thenReturn(Optional.empty());
        ClubPostResponse unpinned = service.updatePost(new Actor(userId), clubId, postId, new UpdateClubPostRequest(null, null, null, false));
        assertThat(unpinned.pinned()).isFalse();
    }
}
