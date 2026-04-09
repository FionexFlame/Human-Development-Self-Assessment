export const CONSENT_VERSION =
  process.env.NEXT_PUBLIC_CONSENT_VERSION || "2026-04-01";

export const CONSENT_COOKIE = "hd_consent_version";

export function getConsentVersion(): string {
  return CONSENT_VERSION;
}

export function getConsentCookie(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";").map((c) => c.trim());
  const match = cookies.find((c) => c.startsWith(`${CONSENT_COOKIE}=`));

  if (!match) return null;

  return decodeURIComponent(match.split("=")[1] || "");
}

export function hasValidConsent(): boolean {
  return getConsentCookie() === CONSENT_VERSION;
}

export function setConsentCookie() {
  if (typeof document === "undefined") return;

  const oneYear = 60 * 60 * 24 * 365;

  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
    CONSENT_VERSION
  )}; path=/; max-age=${oneYear}; samesite=lax`;
}

export async function getClientIp(): Promise<string | null> {
  if (typeof window !== "undefined") return null;

  try {
    const { headers } = await import("next/headers");
    const headerStore = await headers();

    const forwarded = headerStore.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    return (
      headerStore.get("x-real-ip") ||
      headerStore.get("cf-connecting-ip") ||
      null
    );
  } catch {
    return null;
  }
}

export async function getUserAgent(): Promise<string | null> {
  if (typeof window !== "undefined") {
    return navigator.userAgent || null;
  }

  try {
    const { headers } = await import("next/headers");
    const headerStore = await headers();
    return headerStore.get("user-agent") || null;
  } catch {
    return null;
  }
}