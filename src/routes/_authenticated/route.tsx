import { Outlet, createFileRoute } from "@tanstack/react-router";

// Sign-in requirement temporarily turned off so the site can be shared publicly.
// Visitors without an account use browser-local data only; signed-in users still sync.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: () => <Outlet />,
});
