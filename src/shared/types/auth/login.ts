export interface LoginRequest {
  email: string;
  device_id: string;
  device_name: string;
  user_agent: string;
  ip_address: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
}
