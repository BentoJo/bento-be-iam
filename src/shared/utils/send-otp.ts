import { and, eq, sql } from 'drizzle-orm';
import db from '../../../src/shared/configs/db.config';
import { sendEmail } from '../../../src/shared/configs/ses.config';
import { otps } from '../../../src/shared/db/schema';
import { generateOtp } from './generate-otp';
import { hash } from './hash';
import { loginEmail } from './loginEmail';
import { registerEmail } from './registrationEmail';
import { OtpType } from '../types/utils/otp';

export async function createAndSendOtp(
  userId: string,
  name: string,
  email: string,
  type: OtpType,
) {
  await db
    .update(otps)
    .set({
      usedAt: new Date(),
      expiresAt: new Date(Date.now() - 1000),
    })
    .where(and(eq(otps.userId, userId), sql`used_at IS NULL`));
  const otpCode = generateOtp();
  const otpHash = await hash(otpCode);

  await db.insert(otps).values({
    userId: userId,
    type: type,
    code: otpHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  let htmlContent = '';
  let subject = '';

  if (type === 'LOGIN') {
    subject = 'Your Login OTP';
    htmlContent = loginEmail
      .replace('{{name}}', name)
      .replace('{{code}}', otpCode);
  } else if (type === 'REGISTRATION') {
    subject = 'Your New Verification OTP';
    htmlContent = registerEmail
      .replace('{{name}}', name)
      .replace('{{code}}', otpCode);
  }

  await sendEmail(email, subject, htmlContent).catch(console.error);

  return { method: 'EMAIL', email: email, expiresIn: 600 };
}
