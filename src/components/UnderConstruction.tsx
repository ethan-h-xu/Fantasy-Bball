import { Suspense } from "react";
import { requireOnboardedUser } from "@/lib/auth";
import { PageHeader } from "./PageHeader";

/** A whole page for a tab that isn't built yet. */
export function UnderConstruction({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <Notice />
      </Suspense>
    </>
  );
}

async function Notice() {
  await requireOnboardedUser();
  return (
    <div className="card under-construction">
      <h2>Under construction</h2>
      <p className="muted">This page isn&apos;t ready yet. Check back soon.</p>
    </div>
  );
}
