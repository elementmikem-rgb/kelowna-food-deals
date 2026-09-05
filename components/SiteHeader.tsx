import Image from "next/image";
import { SiteNav } from "./SiteNav";

export function SiteHeader({
  active,
  subtitle,
}: {
  active: "specials" | "events";
  subtitle: string;
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={56}
          height={56}
          className="rounded-full shrink-0"
        />
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl sm:text-4xl text-foreground">
            <span className="hand-underline">Kelowna</span> Daily Specials
          </h1>
          <p className="text-muted text-sm">{subtitle}</p>
        </div>
      </div>
      <SiteNav active={active} />
    </header>
  );
}
