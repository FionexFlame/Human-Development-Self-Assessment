import nodemailer from "nodemailer";
import type { DomainResult, OverallProfile } from "@/types";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || "false") === "true";

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

function wrapEmailHtml(body: string, prefsUrl: string, unsubscribeUrl: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;color:#0f172a;line-height:1.6">
    ${body}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />
    <p style="font-size:13px;color:#475569;">
      You are receiving this email because you requested Human Development Assessment results or opted into follow-up communication.
      You can <a href="${prefsUrl}">manage email preferences</a> or <a href="${unsubscribeUrl}">unsubscribe from non-essential emails</a>.
    </p>
  </div>`;
}

function buildResultsEmailHtml(params: {
  participantName: string;
  resultUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
  overall: OverallProfile;
  results: DomainResult[];
  isFinal?: boolean;
}) {
  const strongest = params.overall.strongest
    .map((item) => `<li><strong>${item.title}</strong> — ${item.finalScore}</li>`)
    .join("");

  const weakest = params.overall.weakest
    .map((item) => `<li><strong>${item.title}</strong> — ${item.finalScore}</li>`)
    .join("");

  const heading = params.isFinal
    ? "Your Human Development Assessment Final Results"
    : "Your Human Development Assessment Initial Results";

  const intro = params.isFinal
    ? "Your final reviewed results are now ready. You can open your private results page here:"
    : "Your initial results are ready. You can open your private results page here:";

  const reviewNote = params.isFinal
    ? "These results now include your reviewed written reflections and final feedback."
    : "Your written reflections will be reviewed separately, and your full reviewed results will be sent later by email.";

  const ctaLabel = params.isFinal ? "Open final results" : "Open my results";

  const body = `
    <h1 style="font-size:28px;margin-bottom:8px;">${heading}</h1>
    <p>Hi ${params.participantName || "there"},</p>
    <p>${intro}</p>
    <p><a href="${params.resultUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;">${ctaLabel}</a></p>
    <p>${reviewNote}</p>
    <p><strong>Overall stage:</strong> ${params.overall.stage} — ${params.overall.label}<br/>
    <strong>Average score:</strong> ${params.overall.average}<br/>
    <strong>Lowest 3 average:</strong> ${params.overall.lowestThreeAvg}</p>
    <h2 style="font-size:20px;margin-top:28px;">Strongest domains</h2>
    <ul>${strongest}</ul>
    <h2 style="font-size:20px;margin-top:28px;">Main growth edges</h2>
    <ul>${weakest}</ul>
    <p style="margin-top:28px;color:#475569;">This assessment is a growth tool, not a diagnosis. Your private results link is embedded in the button above.</p>`;

  return wrapEmailHtml(body, params.preferencesUrl, params.unsubscribeUrl);
}

function buildMarketingWelcomeHtml(params: {
  participantName: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}) {
  const body = `
    <h1 style="font-size:28px;margin-bottom:8px;">You’re on the follow-up list</h1>
    <p>Hi ${params.participantName || "there"},</p>
    <p>Thanks for opting into follow-up emails. This list is meant for occasional growth resources, assessment updates, and future workshop or community news tied to the Human Development Assessment.</p>
    <p>You can change this at any time from your preferences page.</p>`;

  return wrapEmailHtml(body, params.preferencesUrl, params.unsubscribeUrl);
}

export async function sendAssessmentResultEmail(params: {
  to: string;
  participantName: string;
  submissionId: string;
  publicToken: string;
  unsubscribeToken: string;
  overall: OverallProfile;
  results: DomainResult[];
  isFinal?: boolean;
}) {
  const transporter = createTransport();
  const baseUrl = getBaseUrl();
  const resultUrl = `${baseUrl}/results/${params.submissionId}?token=${params.publicToken}`;
  const preferencesUrl = `${baseUrl}/email-preferences/${params.unsubscribeToken}`;
  const unsubscribeUrl = `${baseUrl}/unsubscribe/${params.unsubscribeToken}`;
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@example.com";

  const subject = params.isFinal
    ? "Your Human Development Assessment Final Results"
    : "Your Human Development Assessment Initial Results";

  const html = buildResultsEmailHtml({
    participantName: params.participantName,
    resultUrl,
    preferencesUrl,
    unsubscribeUrl,
    overall: params.overall,
    results: params.results,
    isFinal: params.isFinal,
  });

  const text = params.isFinal
    ? `Your Human Development Assessment Final Results are ready.
Results: ${resultUrl}
Preferences: ${preferencesUrl}
Unsubscribe: ${unsubscribeUrl}`
    : `Your Human Development Assessment Initial Results are ready.
Results: ${resultUrl}
Preferences: ${preferencesUrl}
Unsubscribe: ${unsubscribeUrl}`;

  if (!transporter) {
    console.log("[email-preview]", {
      to: params.to,
      subject,
      resultUrl,
      preferencesUrl,
      unsubscribeUrl,
      isFinal: Boolean(params.isFinal),
    });
    return { ok: false as const, skipped: true as const, previewUrl: resultUrl };
  }

  await transporter.sendMail({
    from,
    to: params.to,
    subject,
    html,
    text,
  });

  return { ok: true as const, skipped: false as const, previewUrl: resultUrl };
}

export async function sendMarketingWelcomeEmail(params: {
  to: string;
  participantName: string;
  unsubscribeToken: string;
}) {
  const transporter = createTransport();
  const baseUrl = getBaseUrl();
  const preferencesUrl = `${baseUrl}/email-preferences/${params.unsubscribeToken}`;
  const unsubscribeUrl = `${baseUrl}/unsubscribe/${params.unsubscribeToken}`;
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@example.com";
  const subject = "You’re subscribed to Human Development follow-up emails";

  const html = buildMarketingWelcomeHtml({
    participantName: params.participantName,
    preferencesUrl,
    unsubscribeUrl,
  });

  if (!transporter) {
    console.log("[email-preview]", { to: params.to, subject, preferencesUrl, unsubscribeUrl });
    return { ok: false as const, skipped: true as const };
  }

  await transporter.sendMail({
    from,
    to: params.to,
    subject,
    html,
    text: `You are subscribed to Human Development follow-up emails. Preferences: ${preferencesUrl} Unsubscribe: ${unsubscribeUrl}`,
  });

  return { ok: true as const, skipped: false as const };
}

export async function sendReviewerNotificationEmail(params: {
  participantName: string;
  participantEmail: string;
  submissionId: string;
}) {
  const transporter = createTransport();
  const baseUrl = getBaseUrl();
  const reviewEmail = process.env.REVIEW_NOTIFICATION_EMAIL;
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@example.com";
  const adminQueueUrl = `${baseUrl}/admin/reviews`;

  if (!reviewEmail) {
    console.log("[review-email-skipped] Missing REVIEW_NOTIFICATION_EMAIL");
    return { ok: false as const, skipped: true as const };
  }

  const subject = "New assessment submission needs manual review";

  const html = wrapEmailHtml(
    `
      <h1 style="font-size:28px;margin-bottom:8px;">Manual review needed</h1>
      <p>A new assessment submission is waiting for reflection review.</p>
      <p><strong>Participant name:</strong> ${params.participantName || "Not provided"}</p>
      <p><strong>Participant email:</strong> ${params.participantEmail}</p>
      <p><strong>Submission ID:</strong> ${params.submissionId}</p>
      <p>You can open the admin review queue here:</p>
      <p>
        <a href="${adminQueueUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;">
          Open admin review queue
        </a>
      </p>
      <p style="color:#475569;">If you are not already logged in as admin, this link will first take you to the admin login page.</p>
    `,
    `${baseUrl}`,
    `${baseUrl}`
  );

  if (!transporter) {
    console.log("[review-email-preview]", {
      to: reviewEmail,
      subject,
      submissionId: params.submissionId,
      participantEmail: params.participantEmail,
      adminQueueUrl,
    });
    return { ok: false as const, skipped: true as const };
  }

  await transporter.sendMail({
    from,
    to: reviewEmail,
    subject,
    html,
    text: `A new assessment submission needs manual review.
Participant name: ${params.participantName || "Not provided"}
Participant email: ${params.participantEmail}
Submission ID: ${params.submissionId}
Admin review queue: ${adminQueueUrl}`,
  });

  return { ok: true as const, skipped: false as const };
}

export async function sendReviewedResultsEmail(params: {
  to: string;
  participantName: string;
  submissionId: string;
  publicToken: string;
  unsubscribeToken: string;
}) {
  return sendAssessmentResultEmail({
    to: params.to,
    participantName: params.participantName,
    submissionId: params.submissionId,
    publicToken: params.publicToken,
    unsubscribeToken: params.unsubscribeToken,
    overall: {
      average: 0,
      lowestThreeAvg: 0,
      variability: 0,
      strongest: [],
      weakest: [],
      stage: 0,
      label: "Reviewed",
    },
    results: [],
    isFinal: true,
  });
}