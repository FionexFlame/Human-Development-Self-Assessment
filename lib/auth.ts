import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE = "hd_admin_session";

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  const expected = getAdminPassword();
  return Boolean(expected) && token === expected;
}

export async function requireAdminAuth() {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect("/admin/login");
}
