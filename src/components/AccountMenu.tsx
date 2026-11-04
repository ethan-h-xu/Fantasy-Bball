import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "./SignOutButton";

/** Reads the session, so render it inside <Suspense>. Shows nothing when signed out. */
export async function AccountMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="account">
      {user.email && <span className="muted">{user.email}</span>}
      <SignOutButton />
    </div>
  );
}
