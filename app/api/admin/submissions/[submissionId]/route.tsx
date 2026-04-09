import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword, ADMIN_COOKIE } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";

function isAuthorized(request: NextRequest) {
  const expected = getAdminPassword();
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  return Boolean(expected) && cookie === expected;
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ submissionId: string }> }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { submissionId } = await context.params;

    if (!submissionId) {
      return NextResponse.json(
        { error: "Missing submissionId." },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const { error } = await supabase
      .from("assessment_submissions")
      .delete()
      .eq("id", submissionId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      deletedSubmissionId: submissionId,
    });
  } catch (error) {
    console.error("DELETE /api/admin/submissions/[submissionId] failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete submission.",
      },
      { status: 500 }
    );
  }
}