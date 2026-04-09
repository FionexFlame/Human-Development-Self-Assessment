import { isAdminAuthenticated } from "@/lib/auth";

export async function canViewSubmission(publicToken: string | null, requestedToken: string | null) {
  if (await isAdminAuthenticated()) return true;
  if (!publicToken || !requestedToken) return false;
  return publicToken === requestedToken;
}
