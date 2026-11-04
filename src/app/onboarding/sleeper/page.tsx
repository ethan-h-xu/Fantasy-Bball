import { Suspense } from "react";
import { SleeperUsernameForm } from "@/components/SleeperUsernameForm";
import { getCurrentProfile, requireUser } from "@/lib/auth";

export default function OnboardingSleeperPage() {
  return (
    <>
      <h2>Your Sleeper account</h2>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <SleeperStep />
      </Suspense>
    </>
  );
}

async function SleeperStep() {
  await requireUser();
  const profile = await getCurrentProfile();

  return (
    <>
      <SleeperUsernameForm defaultUsername={profile?.sleeper_username} />
      {profile && <p className="hint">Switching to a different Sleeper account clears your followed leagues.</p>}
    </>
  );
}
