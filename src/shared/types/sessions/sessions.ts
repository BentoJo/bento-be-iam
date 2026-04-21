export interface SessionListResponse {
  id: string;
  ipAddress: string | null;
  lastActivity: Date;
  isCurrent: boolean;
  createdAt: Date;
}

export interface SessionInfo extends SessionListResponse {
  userId: string;
  deviceId: string;
  refreshTokenHash: string;
  revokedAt: Date | null;
  expiresAt: Date;
}

export interface CreateSessionRequest {
  userId: string;
  deviceId: string;
  ipAddress: string;
  refreshTokenHash: string;
}

export interface CreateSessionResponse {
  sessionId: string;
}

// export interface CreateSessionResponse {
//     session_id: string;
//     user_id: string;
//     device_id: string;
//     created_at: string; // int64 → string
// }
