import sgMail from "@sendgrid/mail";

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.FROM_EMAIL;

if (apiKey) {
  sgMail.setApiKey(apiKey);
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!apiKey || !fromEmail) {
    console.log(`📧 [MOCK] Email to ${to}: ${subject}`);
    return;
  }
  await sgMail.send({ to, from: fromEmail, subject, html });
}
