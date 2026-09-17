export default function ExpiredOwnerLoginPage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 text-center gap-3">
      <h1 className="font-display text-2xl text-foreground">This link has expired</h1>
      <p className="text-sm text-muted max-w-sm">
        Login links only work once and expire after a while for security. Contact us and
        we&apos;ll send you a fresh one.
      </p>
    </div>
  );
}
