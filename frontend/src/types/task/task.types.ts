export type TaskItem = {
  id: string;
  clubId: string;
  clubCode: string;
  clubName: string;
  departmentId?: string;
  departmentName?: string;
  eventId?: string;
  eventTitle?: string;
  parentTaskId?: string;
  parentTaskTitle?: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  overdue: boolean;
  progressPercent: number;
  deadline: string;
  assigneeId: string;
  assigneeFullName?: string;
  assignerId: string;
  assignerFullName?: string;
  progressNote?: string;
  reportLink?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskInput = {
  departmentId?: string;
  eventId?: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  priority?: string;
  deadline: string;
  assigneeId: string;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string;
  priority?: string;
  deadline?: string;
  assigneeId?: string;
  status?: string;
};

export type TaskSummary = {
  total: number;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  completedCount: number;
  cancelledCount: number;
  overdueCount: number;
  evaluatedAt: string;
};
