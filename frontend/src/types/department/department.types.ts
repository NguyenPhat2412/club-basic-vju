export type Department = {
  id: string;
  clubId: string;
  name: string;
  description?: string;
  status: string;
};

export type DepartmentMember = {
  id: string;
  departmentId: string;
  membershipId: string;
  userId: string;
  joinedAt: string;
};
