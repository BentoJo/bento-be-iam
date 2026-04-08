export interface RegisterRequest {
  email: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResponse {
  user_id: string;
  email: string;
  auth_status: string;
}
