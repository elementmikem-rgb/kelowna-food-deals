"use client";

export function CityFilter({
  cities,
  selected,
  onSelect,
}: {
  // Derived from the region's own venues (SpecialsBoard), never hardcoded --
  // a static city list here would be wrong for every region but one.
  cities: string[];
  selected: string | "all";
  onSelect: (city: string | "all") => void;
}) {
  const options: (string | "all")[] = ["all", ...cities];
  return (
    <div className="relative -mx-4">
      <div className="flex gap-2 overflow-x-auto pb-1 px-4 no-scrollbar">
        {options.map((opt) => {
          const isSelected = opt === selected;
          const label = opt === "all" ? "All areas" : opt;
          return (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              data-selected={isSelected}
              className={`press-pill shrink-0 rounded-full px-3 py-1 text-xs uppercase tracking-wide border ${
                isSelected
                  ? "bg-surface-raised text-accent border-accent-dim"
                  : "bg-transparent text-muted-2 border-border hover:border-muted"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
    </div>
  );
}
