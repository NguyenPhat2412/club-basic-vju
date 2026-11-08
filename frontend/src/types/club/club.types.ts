export type Club = {
  id: string;
  code: string;
  name: string;
  description?: string;
  activityField?: string;
  contactEmail?: string;
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
