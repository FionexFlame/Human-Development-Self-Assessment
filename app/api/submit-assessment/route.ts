import { NextRequest, NextResponse } from "next/server";
import { getOverallProfile, scoreAssessmentBasic } from "@/lib/scoring";
import { getServiceSupabase } from "@/lib/supabase";
import {
  sendAssessmentResultEmail,
  sendMarketingWelcomeEmail,
  sendReviewerNotificationEmail,
} from "@/lib/email";
import {
  getClientIp,
  getConsentVersion,
  getUserAgent,
  setConsentCookie,
} from "@/lib/compliance";
import { SubmissionPayload } from "@/types";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SubmissionPayload;

    if (!payload.isAdultConfirmed) {
      return NextResponse.json(
        { error: "You must confirm that you are at least 18." },
        { status: 400 }
      );
    }

    if (!payload.participantEmail || !isValidEmail(payload.participantEmail)) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!payload.consentToEmail) {
      return NextResponse.json(
        { error: "Service email consent is required to send and save results." },
        { status: 400 }
      );
    }

    const consentVersion = payload.consentVersion || getConsentVersion();
    const consentStatement =
      "I confirm that I am 18 years of age or older, and I agree to receive my requested assessment results by email and to have my email stored for this assessment workflow.";
    const ipAddress = getClientIp();
    const userAgent = getUserAgent();

    const results = scoreAssessmentBasic(payload.answers, payload.reflections);
    const finalOverall = getOverallProfile(results);

    let submissionId: string | null = null;
    let resultUrl: string | null = null;
    let emailStatus: "pending" | "sent" | "failed" | "suppressed" | "not_requested" =
      "pending";

    try {
      const supabase = getServiceSupabase();
      const nowIso = new Date().toISOString();

      const { data: participant, error: participantError } = await supabase
        .from("assessment_participants")
        .upsert(
          {
            email: payload.participantEmail,
            name: payload.participantName || null,
            service_emails_opt_in: true,
            marketing_emails_opt_in: Boolean(payload.marketingConsent),
            service_email_consented_at: nowIso,
            marketing_email_consented_at: payload.marketingConsent ? nowIso : null,
            marketing_email_revoked_at: payload.marketingConsent ? null : nowIso,
            all_email_revoked_at: null,
          },
          { onConflict: "email" }
        )
        .select("id, email, unsubscribe_token, service_emails_opt_in, marketing_emails_opt_in")
        .single();

      if (participantError) {
        throw participantError;
      }

      const { data, error } = await supabase
        .from("assessment_submissions")
        .insert({
          participant_name: payload.participantName,
          participant_email: payload.participantEmail,
          participant_id: participant?.id ?? null,
          scoring_mode: "basic",
          answers: payload.answers,
          reflections: payload.reflections,
          domain_results: results,
          overall_profile: finalOverall,
          review_status: "pending",
          email_delivery_status: "pending",
          consent_version: consentVersion,
          service_email_consent: true,
          marketing_email_consent: Boolean(payload.marketingConsent),
          consent_statement_text: consentStatement,
        })
        .select("id, public_token")
        .single();

      if (error) {
        throw error;
      }

      const createdSubmissionId = data.id;
      const publicToken = data.public_token;

      submissionId = createdSubmissionId;
      resultUrl = `/results/${createdSubmissionId}?token=${publicToken}`;

      try {
        await sendReviewerNotificationEmail({
          participantName: payload.participantName || "",
          participantEmail: payload.participantEmail,
          submissionId: createdSubmissionId,
        });
      } catch (reviewEmailError) {
        console.error("Reviewer notification email failed:", reviewEmailError);
      }

      if (participant?.id) {
        await supabase
          .from("assessment_participants")
          .update({
            latest_submission_id: createdSubmissionId,
            name: payload.participantName || null,
          })
          .eq("id", participant.id);

        await supabase.from("email_consent_events").insert([
          {
            participant_id: participant.id,
            submission_id: createdSubmissionId,
            email: payload.participantEmail,
            consent_type: "service",
            status: "granted",
            policy_version: consentVersion,
            statement_text: consentStatement,
            source: "assessment_submit",
            ip_address: ipAddress,
            user_agent: userAgent,
          },
          ...(payload.marketingConsent
            ? [
                {
                  participant_id: participant.id,
                  submission_id: createdSubmissionId,
                  email: payload.participantEmail,
                  consent_type: "marketing",
                  status: "granted",
                  policy_version: consentVersion,
                  statement_text:
                    "I agree to optional follow-up emails about growth resources, updates, and future offers.",
                  source: "assessment_submit",
                  ip_address: ipAddress,
                  user_agent: userAgent,
                },
              ]
            : []),
        ]);
      }

      const unsubscribeToken = participant?.unsubscribe_token;
      const canSendServiceEmail = Boolean(
        participant?.service_emails_opt_in !== false && unsubscribeToken
      );

      await supabase.from("email_events").insert({
        participant_id: participant?.id ?? null,
        submission_id: createdSubmissionId,
        email: payload.participantEmail,
        category: "results",
        event_type: canSendServiceEmail ? "attempted" : "suppressed",
        provider_message: canSendServiceEmail
          ? "Preparing assessment result email."
          : "Suppressed because service email preference is off or token missing.",
      });

      if (!canSendServiceEmail) {
        emailStatus = "suppressed";

        await supabase
          .from("assessment_submissions")
          .update({ email_delivery_status: emailStatus })
          .eq("id", createdSubmissionId);
      } else {
        try {
          const sendResult = await sendAssessmentResultEmail({
            to: payload.participantEmail,
            participantName: payload.participantName || "there",
            submissionId: createdSubmissionId,
            publicToken,
            unsubscribeToken,
            overall: finalOverall,
            results,
          });

          emailStatus = sendResult.ok
            ? "sent"
            : sendResult.skipped
            ? "pending"
            : "failed";

          await supabase
            .from("assessment_submissions")
            .update({
              email_delivery_status: emailStatus,
              emailed_at: sendResult.ok ? new Date().toISOString() : null,
            })
            .eq("id", createdSubmissionId);

          await supabase.from("email_events").insert({
            participant_id: participant?.id ?? null,
            submission_id: createdSubmissionId,
            email: payload.participantEmail,
            category: "results",
            event_type: sendResult.ok
              ? "sent"
              : sendResult.skipped
              ? "preview_only"
              : "failed",
            provider_message: sendResult.ok
              ? "Assessment result email sent."
              : sendResult.skipped
              ? "SMTP not configured; preview only."
              : "Unknown email failure.",
          });
        } catch (emailError) {
          console.error("Result email send failed:", emailError);
          emailStatus = "failed";

          await supabase
            .from("assessment_submissions")
            .update({ email_delivery_status: "failed" })
            .eq("id", createdSubmissionId);

          await supabase.from("email_events").insert({
            participant_id: participant?.id ?? null,
            submission_id: createdSubmissionId,
            email: payload.participantEmail,
            category: "results",
            event_type: "failed",
            provider_message:
              emailError instanceof Error
                ? emailError.message
                : "Result email send failed.",
          });
        }
      }

      if (payload.marketingConsent && participant?.unsubscribe_token) {
        try {
          const sendMarketing = await sendMarketingWelcomeEmail({
            to: payload.participantEmail,
            participantName: payload.participantName || "there",
            unsubscribeToken: participant.unsubscribe_token,
          });

          await supabase.from("email_events").insert({
            participant_id: participant?.id ?? null,
            submission_id: createdSubmissionId,
            email: payload.participantEmail,
            category: "marketing",
            event_type: sendMarketing.ok
              ? "sent"
              : sendMarketing.skipped
              ? "preview_only"
              : "failed",
            provider_message: sendMarketing.ok
              ? "Marketing welcome email sent."
              : sendMarketing.skipped
              ? "SMTP not configured; preview only."
              : "Marketing welcome failed.",
          });
        } catch (marketingError) {
          console.error("Marketing welcome email failed:", marketingError);

          await supabase.from("email_events").insert({
            participant_id: participant?.id ?? null,
            submission_id: createdSubmissionId,
            email: payload.participantEmail,
            category: "marketing",
            event_type: "failed",
            provider_message:
              marketingError instanceof Error
                ? marketingError.message
                : "Marketing welcome email failed.",
          });
        }
      }
    } catch (dbOrEmailError) {
      console.error("Submit-assessment DB/email block failed:", dbOrEmailError);
      emailStatus = "failed";
    }

    await setConsentCookie();

    return NextResponse.json({
      submissionId,
      resultUrl,
      emailStatus,
      results,
      overall: finalOverall,
      consentVersion,
      scoringModeUsed: "basic",
      manualReviewPending: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error." },
      { status: 500 }
    );
  }
}
