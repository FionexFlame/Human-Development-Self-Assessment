import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getClientIp, getConsentVersion, getPreferenceSummary, getUserAgent } from "@/lib/compliance";

async function getParticipantByToken(token: string) {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("assessment_participants")
    .select("id, email, name, unsubscribe_token, service_emails_opt_in, marketing_emails_opt_in, service_email_consented_at, marketing_email_consented_at, marketing_email_revoked_at, all_email_revoked_at")
    .eq("unsubscribe_token", token)
    .single();
  return data;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const participant = await getParticipantByToken(token);
    if (!participant) return NextResponse.json({ error: "Preference link not found." }, { status: 404 });
    return NextResponse.json({
      participant: {
        email: participant.email,
        name: participant.name,
        serviceEmails: participant.service_emails_opt_in,
        marketingEmails: participant.marketing_emails_opt_in,
        summary: getPreferenceSummary({
          serviceEmails: participant.service_emails_opt_in,
          marketingEmails: participant.marketing_emails_opt_in,
        }),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load preferences." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const url = new URL(request.url);
  if (url.searchParams.get("mode") !== "unsubscribe-marketing") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }
  try {
    const { token } = await params;
    const participant = await getParticipantByToken(token);
    if (!participant) return NextResponse.json({ error: "Preference link not found." }, { status: 404 });
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();
    await supabase.from("assessment_participants").update({ marketing_emails_opt_in: false, marketing_email_revoked_at: now }).eq("id", participant.id);
    await supabase.from("email_consent_events").insert({
      participant_id: participant.id,
      email: participant.email,
      consent_type: "marketing",
      status: "revoked",
      policy_version: getConsentVersion(),
      statement_text: "One-click unsubscribe from non-essential emails.",
      source: "unsubscribe_page",
      ip_address: getClientIp(request.headers),
      user_agent: getUserAgent(request.headers),
    });
    return NextResponse.redirect(new URL(`/email-preferences/${token}?updated=marketing-off`, request.url));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to unsubscribe." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await request.json();
    const serviceEmails = Boolean(body.serviceEmails);
    const marketingEmails = Boolean(body.marketingEmails);
    const participant = await getParticipantByToken(token);
    if (!participant) return NextResponse.json({ error: "Preference link not found." }, { status: 404 });

    const now = new Date().toISOString();
    const ip = getClientIp(request.headers);
    const userAgent = getUserAgent(request.headers);
    const version = getConsentVersion();
    const supabase = getServiceSupabase();

    await supabase
      .from("assessment_participants")
      .update({
        service_emails_opt_in: serviceEmails,
        marketing_emails_opt_in: marketingEmails,
        service_email_consented_at: serviceEmails ? (participant.service_email_consented_at || now) : participant.service_email_consented_at,
        marketing_email_consented_at: marketingEmails ? (participant.marketing_email_consented_at || now) : participant.marketing_email_consented_at,
        marketing_email_revoked_at: marketingEmails ? null : now,
        all_email_revoked_at: serviceEmails || marketingEmails ? null : now,
      })
      .eq("id", participant.id);

    const events = [];
    if (participant.service_emails_opt_in !== serviceEmails) {
      events.push({
        participant_id: participant.id,
        email: participant.email,
        consent_type: "service",
        status: serviceEmails ? "granted" : "revoked",
        policy_version: version,
        statement_text: "Updated from email preference center.",
        source: "preference_center",
        ip_address: ip,
        user_agent: userAgent,
      });
    }
    if (participant.marketing_emails_opt_in !== marketingEmails) {
      events.push({
        participant_id: participant.id,
        email: participant.email,
        consent_type: "marketing",
        status: marketingEmails ? "granted" : "revoked",
        policy_version: version,
        statement_text: "Updated from email preference center.",
        source: "preference_center",
        ip_address: ip,
        user_agent: userAgent,
      });
    }
    if (events.length) await supabase.from("email_consent_events").insert(events);

    return NextResponse.json({ ok: true, summary: getPreferenceSummary({ serviceEmails, marketingEmails }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update preferences." }, { status: 500 });
  }
}
