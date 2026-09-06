import { redirect } from "next/navigation";

// Bare /admin has never been a real destination -- proxy.ts already gates it
// behind auth, so by the time this renders the request is a logged-in admin
// with nowhere to land. Send them to the default section instead of a 404.
export default function AdminIndexPage() {
  redirect("/admin/submissions");
}
