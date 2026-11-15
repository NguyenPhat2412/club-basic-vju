export type ClubPresetKey =
  | 'SPORTS'
  | 'ACADEMIC_TECH'
  | 'CULTURE_ARTS'
  | 'VOLUNTEER'
  | 'MEDIA_LIFESTYLE';

export type ClubOverviewBlockKey =
  | 'metrics'
  | 'highlights'
  | 'schedule'
  | 'departments'
  | 'gallery';

export type ClubCustomMetric = {
  label: string;
  value: string;
  sub?: string | null;
};

export type ClubHighlightItem = {
  title: string;
  tag?: string | null;
  description?: string | null;
};

export type ClubOverviewConfig = {
  preset?: ClubPresetKey | null;
  slogan?: string | null;
  campusLocation?: string | null;
  operatingSchedule?: string | null;
  enabledBlocks?: ClubOverviewBlockKey[];
  customMetrics?: ClubCustomMetric[];
  highlights?: ClubHighlightItem[];
};

export type Club = {
  id: string;
  code: string;
  name: string;
  description?: string;
  activityField?: string;
  contactEmail?: string;
  overviewConfig?: ClubOverviewConfig | null;
  status: string;
  logoUrl?: string;
  coverUrl?: string;
};

export type ClubInput = {
  code: string;
  name: string;
  description?: string;
  activityField?: string;
  contactEmail?: string;
  overviewConfig?: ClubOverviewConfig | null;
  logoUrl?: string;
  coverUrl?: string;
};

export type Membership = {
  id: string;
  userId: string;
  userFullName?: string;
  userStudentCode?: string;
  clubId: string;
  clubCode: string;
  clubName: string;
  status: string;
  joinedAt?: string;
  leftAt?: string;
  departments: { id: string; name: string }[];
};
