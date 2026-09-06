import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata = { title: "Booking received" };

export default function BookingSuccessPage() {
  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-6">
      <SiteHeader active="blog" subtitle="Payment received." />
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="font-display text-xl text-foreground mb-1">Payment received</p>
        <p className="text-sm text-muted">
          Your booking is now pending review. You&apos;ll hear from us within a day or two once
          it&apos;s approved and live.
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
