import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_KEY!,
  },
});

export async function sendEmail(
  email: string,
  subject: string,
  bodyHtml: string,
): Promise<void> {
  const command = new SendEmailCommand({
    Source: `${process.env.FROM_EMAIL_AWS!}`,

    Destination: {
      ToAddresses: [email],
    },

    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        // HTML
        Html: {
          Data: bodyHtml,
          Charset: 'UTF-8',
        },
      },
    },
  });

  try {
    const response = await ses.send(command);
    console.log('✅ Email sent:', response.MessageId);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}
