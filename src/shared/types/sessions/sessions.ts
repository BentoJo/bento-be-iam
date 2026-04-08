export interface SessionInfo {
  id: string;
  ipAddress: string | null;
  lastActivity: Date;
  isCurrent: boolean;
  createdAt: Date;
}
