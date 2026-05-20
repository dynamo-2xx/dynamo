// Founder gate for /admin/costs.
// Set FOUNDER_USER_ID to your own user_id to hard-gate the dashboard.
// If left empty, the dashboard falls back to the `admin` role check (is_admin).
export const FOUNDER_USER_ID = "331dee1c-373c-47f7-8a85-32ac9202e4e3";

export function isFounder(userId: string | null | undefined): boolean {
  if (!FOUNDER_USER_ID) return true; // fall through to RLS / role check
  return !!userId && userId === FOUNDER_USER_ID;
}