export type ChatChannel = {
  id: string;
  clubId: string;
  departmentId?: string;
  departmentName?: string;
  eventId?: string;
  eventTitle?: string;
  name: string;
  channelType: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  channelId: string;
  senderId?: string;
  senderFullName?: string;
  senderType: 'USER' | 'AI_BOT';
  content: string;
  createdAt: string;
};

export type AiSummary = {
  id: string;
  channelId: string;
  requestedBy: string;
  messageCount: number;
  summary: string;
  decisions: string[];
  suggestedTasks: string[];
  suggestedEvents: string[];
  model: string;
  createdAt: string;
};
