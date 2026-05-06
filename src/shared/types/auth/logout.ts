export interface LogoutRequest {
  refreshToken: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface LogoutAllRequest {
  userId: string;
}

export interface LogoutAllResponse {
  success: boolean;
  message: string;
}
