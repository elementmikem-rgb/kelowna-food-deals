"use client";

const CITIES = ["Kelowna", "West Kelowna", "Lake Country", "Peachland"];

export function CityFilter({
  selected,
  onSelect,
}: {
  selected: string | "all";
  onSelect: (city: string | "all") => void;
}) {
  const options: (string | "all")[] = ["all", ...CITIES];
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
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
  );
}
