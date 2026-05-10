// Server component — owns route segment config so force-dynamic is respected.
export const dynamic = "force-dynamic";

import OnboardingClient from "./OnboardingClient";

export default function OnboardingPage() {
  return <OnboardingClient />;
}
