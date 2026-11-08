export type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
};

export type ResourceNotificationInput = {
  title: string;
  message: string;
  idempotencyKey?: string;
  includeSubtasks?: boolean;
};

export type ResourceNotificationResult = {
  referenceType: string;
  referenceId: string;
  clubId: string;
  recipientCount: number;
};
