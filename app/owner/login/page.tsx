import { OwnerLoginOptions } from "@/components/OwnerLoginOptions";

// Direct, linkable entry point (e.g. "Trouble logging in?" in a digest/outreach email)
// for an owner who doesn't have a fresh magic link handy -- the expired-link page
// shows the same form, this just gives it its own reachable URL.
export default function OwnerLoginPage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 text-center gap-4">
      <h1 className="font-display text-2xl text-foreground">Log in to your listing</h1>
      <OwnerLoginOptions />
    </div>
  );
}
