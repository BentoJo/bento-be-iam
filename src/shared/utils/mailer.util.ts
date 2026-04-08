import nodemailer from 'nodemailer';

export async function mailer(
  email: string | string[], 
  subject: string, 
  content: string,
  html :  string = ''
): Promise<void> {

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST!,
    port : process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT) : 587,
    auth: {
      user: process.env.MAIL_USER!,  
      pass: process.env.MAIL_PASS!,
    },
  });

  const toField = Array.isArray(email) ? email.join(', ') : email;

  const mailOptions = {
    from: process.env.MAIL_USER!,
    to: toField,
    subject: subject,
    text: content,
    html : html
  };

  await transporter.sendMail(mailOptions);
}