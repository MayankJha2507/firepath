// Server component — owns route segment config so force-dynamic is respected.
export const dynamic = "force-dynamic";

import AuthClient from "./AuthClient";

export default function AuthPage() {
  return <AuthClient />;
}
