import { randomInt } from "crypto";

export const generateOtp = () =>
  randomInt(100000, 999999).toString(); // Generates a cryptographically secure 6-digit OTP
