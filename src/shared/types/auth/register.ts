export interface RegisterRequest {
  email: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  authStatus: string;
}
