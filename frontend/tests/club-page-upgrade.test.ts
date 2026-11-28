import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { clubsApi } from '@/api/club/clubs.api';
import { API_ROUTES } from '@/lib/api/routes';
import { translateUiText } from '@/i18n/translator';

test('exposes all 6 Club Page API routes and 7 client methods', () => {
  const clubId = '00000000-0000-0000-0000-000000000001';
  const postId = '00000000-0000-0000-0000-000000000002';
  assert.equal(API_ROUTES.clubs.publicPosts(clubId), `/public/clubs/${clubId}/posts`);
  assert.equal(API_ROUTES.clubs.posts(clubId), `/clubs/${clubId}/posts`);
  assert.equal(API_ROUTES.clubs.postDetail(clubId, postId), `/clubs/${clubId}/posts/${postId}`);
  assert.equal(API_ROUTES.clubs.postLike(clubId, postId), `/clubs/${clubId}/posts/${postId}/like`);
  assert.equal(API_ROUTES.clubs.publicFollowStatus(clubId), `/public/clubs/${clubId}/follow-status`);
  assert.equal(API_ROUTES.clubs.follow(clubId), `/clubs/${clubId}/follow`);

  assert.equal(typeof clubsApi.publicClubPosts, 'function');
  assert.equal(typeof clubsApi.createClubPost, 'function');
  assert.equal(typeof clubsApi.updateClubPost, 'function');
  assert.equal(typeof clubsApi.deleteClubPost, 'function');
  assert.equal(typeof clubsApi.toggleClubPostLike, 'function');
  assert.equal(typeof clubsApi.publicClubFollowStatus, 'function');
  assert.equal(typeof clubsApi.toggleClubFollow, 'function');
});

test('consolidates ClubSettingsTab into 4 sections without duplicate broadcast form', () => {
  const settingsSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/management/ClubSettingsTab.tsx'),
    'utf8',
  );
  const profileSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/management/ClubProfileSettingsPanel.tsx'),
    'utf8',
  );
  assert.match(settingsSource, /"profile" \| "posts" \| "facebook" \| "appearance"/);
  assert.doesNotMatch(settingsSource, /broadcastNotification/);
  assert.match(profileSource, /\/notifications\?tab=campaigns&clubId=/);
});

test('mounts SystemGlobalBanner on /home and wires ClubFollowButton + ClubPublicPostsFeed on portfolio', () => {
  const homeSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/home/HomeLandingView.tsx'),
    'utf8',
  );
  const portfolioSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/club/ClubPortfolioView.tsx'),
    'utf8',
  );
  assert.match(homeSource, /SystemGlobalBanner/);
  assert.match(portfolioSource, /ClubFollowButton/);
  assert.match(portfolioSource, /ClubPublicPostsFeed/);
});

test('localizes all new Club Page strings into EN and JA', () => {
  assert.equal(translateUiText('Trang & Cài đặt CLB', 'en'), 'Club Page & Settings');
  assert.equal(translateUiText('Trang & Cài đặt CLB', 'ja'), 'クラブページ・設定');
  assert.equal(translateUiText('Bảng tin CLB', 'en'), 'Club Feed');
  assert.equal(translateUiText('Theo dõi CLB', 'en'), 'Follow Club');
  assert.equal(translateUiText('Đang theo dõi', 'ja'), 'フォロー中');
  assert.equal(translateUiText('12 người theo dõi', 'en'), '12 followers');
  assert.equal(translateUiText('12 người theo dõi', 'ja'), 'フォロワー 12 名');
  assert.equal(translateUiText('5 bài viết', 'en'), '5 posts');
  assert.equal(translateUiText('3 lượt thích', 'ja'), '3 いいね');
});
