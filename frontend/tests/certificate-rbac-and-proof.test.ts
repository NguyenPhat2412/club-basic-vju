import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { certificateApi } from '@/api/certificate/certificate.api';
import { translateUiText } from '@/i18n/translator';
import { MODULE_LABELS, PERMISSION_META } from '@/utils/access/permission-meta';

test('exposes all 6 dedicated RBAC permissions for certificates, training points reports, and club posts', () => {
  assert.equal(MODULE_LABELS.certificate, 'Chứng nhận điện tử');
  assert.equal(MODULE_LABELS.report, 'Báo cáo & Điểm rèn luyện');

  for (const key of [
    'certificate.view',
    'certificate.issue',
    'certificate.template',
    'certificate.revoke',
    'report.training_points.view',
    'club.post.manage',
  ]) {
    assert.ok(PERMISSION_META[key], `Missing PERMISSION_META entry for ${key}`);
    assert.ok(PERMISSION_META[key].label.length > 5);
  }
});

test('certificateApi exposes verifiable proof share link methods', () => {
  assert.equal(typeof certificateApi.myCertificateShareLinks, 'function');
  assert.equal(typeof certificateApi.createCertificateShareLink, 'function');
  assert.equal(typeof certificateApi.revokeCertificateShareLink, 'function');
  assert.equal(typeof certificateApi.resolveCertificateProof, 'function');
});

test('HomeEventsSection resolves club media fallback photos when coverImageUrl is null', () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/home/HomeEventsSection.tsx'),
    'utf8',
  );
  assert.match(source, /useClubMediaCatalog/);
  assert.match(source, /clubCoverFallback/);
  assert.match(source, /onError=/);
});

test('ProfileCertificatesCard wires share panel and new files stay under 400 lines', () => {
  const files = [
    'src/components/profile/ProfileCertificatesCard.tsx',
    'src/components/profile/ProfileCertificateSharePanel.tsx',
    'src/components/certificate/CertificateProofVerifyView.tsx',
    'src/components/home/HomeEventsSection.tsx',
  ];
  for (const rel of files) {
    const lines = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8').split('\n').length;
    assert.ok(lines < 400, `${rel} has ${lines} lines (must be < 400)`);
  }
  const profileSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/profile/ProfileCertificatesCard.tsx'),
    'utf8',
  );
  assert.match(profileSource, /ProfileCertificateSharePanel/);
});

test('localizes new certificate RBAC and DRL proof strings to EN and JA', () => {
  assert.equal(translateUiText('Chứng nhận điện tử', 'en'), 'E-Certificates');
  assert.equal(translateUiText('Chứng nhận điện tử', 'ja'), '電子証明書');
  assert.equal(translateUiText('Chia sẻ minh chứng ĐRL', 'en'), 'Share DRL Proof Link');
  assert.equal(translateUiText('Chia sẻ minh chứng ĐRL', 'ja'), '活動証明リンクを共有');
  assert.equal(translateUiText('Minh chứng hợp lệ', 'en'), 'Verified Proof');
  assert.equal(translateUiText('Minh chứng hợp lệ', 'ja'), '有効な証明');
});
