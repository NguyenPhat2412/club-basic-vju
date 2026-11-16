import type {
  ClubCustomMetric,
  ClubHighlightItem,
  ClubOverviewBlockKey,
  ClubOverviewConfig,
  ClubPresetKey,
} from '@/types/club/club.types';

export const DEFAULT_OVERVIEW_BLOCKS: ClubOverviewBlockKey[] = [
  'metrics',
  'highlights',
  'schedule',
  'departments',
  'gallery',
];

const VALID_PRESETS = new Set<ClubPresetKey>([
  'SPORTS',
  'ACADEMIC_TECH',
  'CULTURE_ARTS',
  'VOLUNTEER',
  'MEDIA_LIFESTYLE',
]);

const VALID_BLOCKS = new Set<ClubOverviewBlockKey>(DEFAULT_OVERVIEW_BLOCKS);

export interface ClubPresetMeta {
  key: ClubPresetKey;
  label: string;
  shortDesc: string;
  badgeClass: string;
  surfaceClass: string;
  metricAccentClass: string;
}

export const CLUB_PRESET_META: Record<ClubPresetKey, ClubPresetMeta> = {
  SPORTS: {
    key: 'SPORTS',
    label: 'Thể thao & Giải đấu',
    shortDesc: 'Tập luyện sân bãi, đội hình thi đấu & giải giao hữu',
    badgeClass: 'border-primary/25 bg-accent text-primary',
    surfaceClass: 'from-accent/70 via-card to-card border-border',
    metricAccentClass: 'text-primary',
  },
  ACADEMIC_TECH: {
    key: 'ACADEMIC_TECH',
    label: 'Học thuật & Chế tạo Kỹ thuật',
    shortDesc: 'Lab chế tạo, nhóm nghiên cứu NCKH, seminar & học bổng',
    badgeClass: 'border-border bg-secondary text-secondary-foreground',
    surfaceClass: 'from-secondary/85 via-card to-card border-border',
    metricAccentClass: 'text-foreground',
  },
  CULTURE_ARTS: {
    key: 'CULTURE_ARTS',
    label: 'Văn hóa & Nghệ thuật',
    shortDesc: 'Giao lưu Việt – Nhật, âm nhạc, vũ đạo & triển lãm mỹ thuật',
    badgeClass: 'border-primary/20 bg-accent text-primary',
    surfaceClass: 'from-accent/55 via-card to-card border-border',
    metricAccentClass: 'text-primary',
  },
  VOLUNTEER: {
    key: 'VOLUNTEER',
    label: 'Tình nguyện & Cộng đồng',
    shortDesc: 'Chiến dịch thiện nguyện, giờ cống hiến & điều phối CTV',
    badgeClass: 'border-primary/25 bg-primary/10 text-primary',
    surfaceClass: 'from-primary/8 via-card to-card border-border',
    metricAccentClass: 'text-primary',
  },
  MEDIA_LIFESTYLE: {
    key: 'MEDIA_LIFESTYLE',
    label: 'Truyền thông, Sự kiện & Đời sống',
    shortDesc: 'Sản xuất nội dung, nhiếp ảnh, tổ chức sự kiện & ẩm thực',
    badgeClass: 'border-border bg-muted text-secondary-foreground',
    surfaceClass: 'from-muted/80 via-card to-card border-border',
    metricAccentClass: 'text-secondary-foreground',
  },
};

export const CLUB_OVERVIEW_BLOCK_OPTIONS: {
  key: ClubOverviewBlockKey;
  label: string;
  hint: string;
}[] = [
  { key: 'metrics', label: 'Chỉ số đặc thù CLB', hint: 'Hiển thị tối đa 4 KPI riêng của từng câu lạc bộ' },
  { key: 'highlights', label: 'Dấu ấn & Chương trình tiêu biểu', hint: 'Giải đấu, dự án Lab, chiến dịch hoặc triển lãm nổi bật' },
  { key: 'schedule', label: 'Lịch & Cơ sở sinh hoạt', hint: 'Lịch tập/họp định kỳ tại Hòa Lạc & Mỹ Đình' },
  { key: 'departments', label: 'Phân tích Ban chuyên môn', hint: 'Bảng cơ cấu nhân sự, sức hút NV1/NV2 và việc theo Ban' },
  { key: 'gallery', label: 'Thư viện ảnh hoạt động', hint: 'Hiển thị bộ ảnh hoạt động trên hồ sơ công khai' },
];

export interface NormalizedClubOverviewConfig {
  preset: ClubPresetKey | null;
  slogan: string;
  campusLocation: string;
  operatingSchedule: string;
  enabledBlocks: ClubOverviewBlockKey[];
  customMetrics: ClubCustomMetric[];
  highlights: ClubHighlightItem[];
}

export function normalizeClubOverviewConfig(
  raw?: ClubOverviewConfig | null
): NormalizedClubOverviewConfig {
  const rawPreset = raw?.preset ? (String(raw.preset).trim().toUpperCase() as ClubPresetKey) : null;
  const preset = rawPreset && VALID_PRESETS.has(rawPreset) ? rawPreset : null;

  const enabledBlocks = Array.isArray(raw?.enabledBlocks)
    ? Array.from(
        new Set(
          raw.enabledBlocks
            .map((b) => String(b).trim().toLowerCase() as ClubOverviewBlockKey)
            .filter((b) => VALID_BLOCKS.has(b))
        )
      )
    : [...DEFAULT_OVERVIEW_BLOCKS];

  const customMetrics: ClubCustomMetric[] = (raw?.customMetrics ?? [])
    .filter((m): m is ClubCustomMetric => Boolean(m && m.label?.trim() && m.value?.trim()))
    .slice(0, 4)
    .map((m) => ({
      label: m.label.trim(),
      value: m.value.trim(),
      sub: m.sub?.trim() || undefined,
    }));

  const highlights: ClubHighlightItem[] = (raw?.highlights ?? [])
    .filter((h): h is ClubHighlightItem => Boolean(h && h.title?.trim()))
    .slice(0, 4)
    .map((h) => ({
      title: h.title.trim(),
      tag: h.tag?.trim() || undefined,
      description: h.description?.trim() || undefined,
    }));

  return {
    preset,
    slogan: raw?.slogan?.trim() ?? '',
    campusLocation: raw?.campusLocation?.trim() ?? '',
    operatingSchedule: raw?.operatingSchedule?.trim() ?? '',
    enabledBlocks,
    customMetrics,
    highlights,
  };
}

export function hasCustomClubOverview(raw?: ClubOverviewConfig | null): boolean {
  const c = normalizeClubOverviewConfig(raw);
  return Boolean(
    c.preset ||
      c.slogan ||
      c.campusLocation ||
      c.operatingSchedule ||
      c.customMetrics.length > 0 ||
      c.highlights.length > 0
  );
}

export function buildPresetStarterConfig(preset: ClubPresetKey): NormalizedClubOverviewConfig {
  const templates: Record<ClubPresetKey, Omit<NormalizedClubOverviewConfig, 'preset' | 'enabledBlocks'>> = {
    SPORTS: {
      slogan: 'Rèn thể lực, gắn kết đồng đội tại sân tập Hòa Lạc & Mỹ Đình',
      campusLocation: 'Khu Thể thao Hòa Lạc & Cơ sở Mỹ Đình',
      operatingSchedule: 'Thứ 3 & Thứ 6 · 17:30 – 19:30 (Tập kỹ thuật & Đấu tập)',
      customMetrics: [
        { label: 'Giải đấu thường niên', value: '03 giải', sub: 'Nội bộ VJU & giao hữu khối ĐHQGHN' },
        { label: 'Đội hình duy trì', value: 'Nam & Nữ', sub: 'Huấn luyện định kỳ hàng tuần' },
      ],
      highlights: [
        { title: 'Giải Thể thao Sinh viên Thường niên', tag: 'Giải truyền thống', description: 'Sân chơi thi đấu và tuyển chọn vận động viên đại diện CLB.' },
      ],
    },
    ACADEMIC_TECH: {
      slogan: 'Học tập chủ động, nghiên cứu thực nghiệm theo tinh thần Việt – Nhật',
      campusLocation: 'Phòng Lab Hòa Lạc & Phòng Seminar Cơ sở Mỹ Đình',
      operatingSchedule: 'Thứ 5 · 19:00 – 21:00 (Seminar & Thực hành nhóm)',
      customMetrics: [
        { label: 'Nhóm chuyên đề / Lab', value: '04 nhóm', sub: 'Nghiên cứu & chế tạo thực tế' },
        { label: 'Workshop & Seminar', value: '12 buổi/năm', sub: 'Chia sẻ cùng giảng viên & cố vấn' },
      ],
      highlights: [
        { title: 'Ngày hội Trình diễn Đề tài & Sản phẩm Sinh viên', tag: 'Showcase học thuật', description: 'Công bố kết quả nghiên cứu và mô hình thực nghiệm của các thành viên.' },
      ],
    },
    CULTURE_ARTS: {
      slogan: 'Lan tỏa bản sắc văn hóa Việt – Nhật và cảm hứng sáng tạo nghệ thuật',
      campusLocation: 'Không gian Văn hóa Hòa Lạc & Hội trường Mỹ Đình',
      operatingSchedule: 'Thứ 3 & Thứ 7 · 17:30 – 20:00 (Sinh hoạt chuyên môn & Tập luyện)',
      customMetrics: [
        { label: 'Sự kiện & Đêm diễn', value: '06 chương trình', sub: 'Lễ hội văn hóa & sân khấu trường' },
        { label: 'Workshop trải nghiệm', value: '10 chủ đề', sub: 'Mở rộng cho sinh viên toàn trường' },
      ],
      highlights: [
        { title: 'Không gian Giao lưu Văn hóa & Nghệ thuật Thường niên', tag: 'Sự kiện tâm điểm', description: 'Kết nối sinh viên Việt Nam và lưu học sinh quốc tế tại VJU.' },
      ],
    },
    VOLUNTEER: {
      slogan: 'Kết nối trái tim tình nguyện — Hành động thiết thực vì cộng đồng',
      campusLocation: 'Cơ sở Hòa Lạc, Mỹ Đình & Các địa phương thiện nguyện',
      operatingSchedule: 'Thứ 4 · 19:00 – 20:30 (Điều phối chiến dịch & Hậu cần)',
      customMetrics: [
        { label: 'Chiến dịch cộng đồng', value: '04 đợt/năm', sub: 'Tình nguyện tại chỗ & vùng cao' },
        { label: 'Lượt CTV tham gia', value: '150+ lượt', sub: 'Mở đăng ký CTV toàn trường' },
      ],
      highlights: [
        { title: 'Chiến dịch Tình nguyện Mùa Đông Ấm & Môi trường Xanh', tag: 'Thiện nguyện', description: 'Hoạt động gây quỹ và hỗ trợ học sinh vùng khó khăn.' },
      ],
    },
    MEDIA_LIFESTYLE: {
      slogan: 'Sáng tạo góc nhìn mới — Ghi dấu nhịp sống sinh viên Việt Nhật',
      campusLocation: 'Cơ sở Hòa Lạc & Cơ sở Mỹ Đình',
      operatingSchedule: 'Thứ 6 · 17:30 – 19:30 (Sản xuất nội dung & Workshop thực hành)',
      customMetrics: [
        { label: 'Chiến dịch & Ấn phẩm', value: '15+ dự án', sub: 'Truyền thông, nhiếp ảnh & đời sống' },
        { label: 'Sự kiện đồng hành', value: '10+ sự kiện', sub: 'Phối hợp liên CLB toàn trường' },
      ],
      highlights: [
        { title: 'Chuỗi Workshop Kỹ năng & Trải nghiệm Sinh viên', tag: 'Hoạt động mở', description: 'Không gian thực hành sáng tạo và gắn kết đời sống học đường.' },
      ],
    },
  };

  return {
    preset,
    enabledBlocks: [...DEFAULT_OVERVIEW_BLOCKS],
    ...templates[preset],
  };
}

export function formatBytesCompact(bytes?: number | null): string {
  const n = Number(bytes ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
