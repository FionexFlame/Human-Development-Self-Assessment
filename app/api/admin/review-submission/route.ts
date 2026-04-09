import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getOverallProfile, stageFromScore } from "@/lib/scoring";
import { getAdminPassword, ADMIN_COOKIE } from "@/lib/auth";
import { SubmissionRow } from "@/types";
import { sendAssessmentResultEmail } from "@/lib/email";

function isAuthorized(request: NextRequest) {
  const expected = getAdminPassword();
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  return Boolean(expected) && cookie === expected;
}

function withUpdatedResults(
  existingResults: any[],
  manualScores: Record<string, number>,
  reviewerNotes: string | null
) {
  return existingResults.map((result) => {
    const manualScore = manualScores[result.domainId];

    if (manualScore === undefined) {
      return result;
    }

    const stageInfo = stageFromScore(manualScore);
    const existingNotes = Array.isArray(result.notes) ? result.notes : [];

    return {
      ...result,
      reflectionScore: manualScore,
      finalScore: manualScore,
      stage: stageInfo.stage,
      label: stageInfo.label,
      notes: reviewerNotes
        ? [...existingNotes, `Reviewer note: ${reviewerNotes}`]
        : existingNotes,
    };
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    const submissionId =
      typeof body.submissionId === "string" ? body.submissionId : "";

    const manualScores =
      body.manualScores && typeof body.manualScores === "object"
        ? (body.manualScores as Record<string, number>)
        : null;

    const reviewerNotes =
      typeof body.reviewerNotes === "string" ? body.reviewerNotes.trim() : null;

    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId." }, { status: 400 });
    }

    if (!manualScores || Object.keys(manualScores).length === 0) {
      return NextResponse.json({ error: "Missing manualScores." }, { status: 400 });
    }

    for (const [domainId, rawScore] of Object.entries(manualScores)) {
      const score = Number(rawScore);

      if (!Number.isFinite(score) || score < 0 || score > 5) {
        return NextResponse.json(
          { error: `Manual score for ${domainId} must be between 0 and 5.` },
          { status: 400 }
        );
      }
    }

    const supabase = getServiceSupabase();

    const { data: submissionRow, error: submissionError } = await supabase
      .from("assessment_submissions")
      .select(
        "id, participant_id, participant_name, participant_email, answers, reflections, domain_results, overall_profile, review_status, human_override, public_token, email_delivery_status, emailed_at, created_at, updated_at"
      )
      .eq("id", submissionId)
      .single();

    if (submissionError || !submissionRow) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const typedSubmission = submissionRow as SubmissionRow;
    const existingResults = Array.isArray(typedSubmission.domain_results)
      ? typedSubmission.domain_results
      : [];

    if (existingResults.length === 0) {
      return NextResponse.json(
        { error: "This submission has no domain_results to update." },
        { status: 400 }
      );
    }

    const updatedResults = withUpdatedResults(existingResults, manualScores, reviewerNotes);
    const updatedOverall = getOverallProfile(updatedResults);

    const humanOverrideMap = Object.entries(manualScores).reduce<
      Record<string, { score: number; notes?: string }>
    >((acc, [domainId, score]) => {
      acc[domainId] = {
        score: Number(score),
        notes: reviewerNotes || undefined,
      };
      return acc;
    }, {});

    const { error: updateSubmissionError } = await supabase
      .from("assessment_submissions")
      .update({
        domain_results: updatedResults,
        overall_profile: updatedOverall,
        human_override: humanOverrideMap,
        review_status: "reviewed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (updateSubmissionError) {
      return NextResponse.json(
        { error: updateSubmissionError.message || "Failed to update submission." },
        { status: 500 }
      );
    }

    let emailSent = false;

    if (
      typedSubmission.participant_email &&
      typedSubmission.public_token &&
      typedSubmission.participant_id
    ) {
      const { data: participant, error: participantError } = await supabase
        .from("assessment_participants")
        .select("id, unsubscribe_token, service_emails_opt_in")
        .eq("id", typedSubmission.participant_id)
        .single();

      if (participantError) {
        return NextResponse.json(
          { error: participantError.message || "Failed to load participant record." },
          { status: 500 }
        );
      }

      if (participant?.service_emails_opt_in && participant?.unsubscribe_token) {
        const emailResult = await sendAssessmentResultEmail({
          to: typedSubmission.participant_email,
          participantName: typedSubmission.participant_name || "there",
          submissionId: typedSubmission.id,
          publicToken: typedSubmission.public_token,
          unsubscribeToken: participant.unsubscribe_token,
          overall: updatedOverall,
          results: updatedResults,
          isFinal: true,
        });

        emailSent = Boolean(emailResult?.ok);

        const { error: emailUpdateError } = await supabase
          .from("assessment_submissions")
          .update({
            email_delivery_status: emailResult.ok
              ? "sent"
              : emailResult.skipped
              ? "pending"
              : "failed",
            emailed_at: emailResult.ok ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", submissionId);

        if (emailUpdateError) {
          return NextResponse.json(
            { error: emailUpdateError.message || "Failed to update email status." },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      submissionId,
      overall: updatedOverall,
      results: updatedResults,
      emailSent,
    });
  } catch (error) {
    console.error("POST /api/admin/review-submission failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save review.",
      },
      { status: 500 }
    );
  }
}