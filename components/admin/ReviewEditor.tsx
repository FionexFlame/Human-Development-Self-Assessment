import Link from "next/link";
import { requireAdminAuth } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import ResendEmailButton from "@/components/admin/ResendEmailButton";
import { SubmissionRow } from "@/types";

async function getPendingSubmissions() {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("assessment_submissions")
      .select(`
        id,
        participant_name,
        participant_email,
        public_token,
        email_delivery_status,
        review_status,
        created_at,
        domain_results,
        reflections
      `)
      .eq("review_status", "pending")
      .order("created_at", { ascending: false });

    return (data ?? []) as Partial<SubmissionRow>[];
  } catch (error) {
    console.error("Failed to load pending submissions:", error);
    return [];
  }
}

export default async function AdminReviewsPage() {
  await requireAdminAuth();
  const submissions = await getPendingSubmissions();

  return (
    <main className="container">
      <div className="card">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            className="button"
            href={`/admin/reviews/${submission.id}`}
          >
            Open review editor
          </Link>
          
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="button" href={`/admin/reviews/${submission.id}`}></Link>
              Open review editor
            </Link>

            <Link className="button" href={`/admin/reviews/${submission.id}`}></Link>
        <div>
            <div className="badge">Manual review queue</div>
            <h1 style={{ fontSize: 38, marginBottom: 8 }}>Reflection review admin</h1>
            <p className="small" style={{ maxWidth: 860, lineHeight: 1.7 }}>
              These submissions are waiting for manual reflection review. Participants have
              already received their initial results, and you can use this queue to review
              written reflections and follow up with final reviewed results later.
            </p>
          </div>
          <AdminLogoutButton />
        </div>

        {submissions.length === 0 ? (
          <p className="small">
            No pending review submissions found yet.
          </p>
        ) : (
          <div className="grid" style={{ gap: 18, marginTop: 20 }}>
            {submissions.map((submission) => {
              const domainResults = Array.isArray(submission.domain_results)
                ? submission.domain_results
                : [];

              const reflections =
                submission.reflections && typeof submission.reflections === "object"
                  ? (submission.reflections as Record<string, string>)
                  : {};

              return (
                <div className="card subtle-card" key={submission.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {submission.participant_name || "Unnamed participant"}
                      </div>
                      <div className="small">
                        Submission:{" "}
                        <Link
                          href={`/results/${submission.id}?token=${submission.public_token || ""}`}
                        >
                          {submission.id}
                        </Link>
                      </div>
                      <div className="small">
                        Participant email: {submission.participant_email || "unknown"}
                      </div>
                      <div className="small">
                        Email delivery: {submission.email_delivery_status || "unknown"}
                      </div>
                      <div className="small">
                        Review status: {submission.review_status || "unknown"}
                      </div>
                      <div className="small">
                        Created: {submission.created_at || "unknown"}
                      </div>
                    </div>

                    <ResendEmailButton submissionId={submission.id as string} />
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <h3 style={{ marginBottom: 8 }}>Reflection responses</h3>

                    {Object.keys(reflections).length === 0 ? (
                      <p className="small">No written reflections found.</p>
                    ) : (
                      <div className="grid" style={{ gap: 12 }}>
                        {Object.entries(reflections).map(([domainId, text]) => {
                          const matchingResult = domainResults.find(
                            (result: any) => result.domainId === domainId
                          );

                          return (
                            <div
                              key={domainId}
                              style={{
                                padding: 12,
                                border: "1px solid #e5e7eb",
                                borderRadius: 12,
                              }}
                            >
                              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                {matchingResult?.title || domainId}
                              </div>
                              <div className="small" style={{ marginBottom: 8 }}>
                                Current reflection score:{" "}
                                {matchingResult?.reflectionScore ?? "N/A"} | Final score:{" "}
                                {matchingResult?.finalScore ?? "N/A"}
                              </div>
                              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                                {text || "No response."}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}