"use client";

import { useState } from "react";
import { formatPrice, CATEGORY_LABELS, EVENT_TYPE_LABELS } from "@/lib/format";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface SpecialData {
  id: number;
  title: string;
  description: string | null;
  priceCents: number | null;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  category: string;
}

interface EventData {
  id: number;
  title: string;
  description: string | null;
  eventType: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string | null;
  endTime: string | null;
  coverChargeCents: number | null;
}

interface MenuItemData {
  id: number;
  name: string;
  description: string | null;
  priceCents: number | null;
}

function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function centsToDollars(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toString();
}

function SectionShell({
  title,
  children,
  addForm,
}: {
  title: string;
  children: React.ReactNode;
  addForm: React.ReactNode;
}) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-foreground">{title}</h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted"
        >
          {showAdd ? "Cancel" : "Add new"}
        </button>
      </div>
      {showAdd && <div onClick={(e) => e.stopPropagation()}>{addForm}</div>}
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function SpecialForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial: Omit<SpecialData, "id">;
  onSubmit: (data: Omit<SpecialData, "id">) => Promise<void>;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [price, setPrice] = useState(centsToDollars(initial.priceCents));
  const [dayOfWeek, setDayOfWeek] = useState(initial.dayOfWeek === null ? "" : String(initial.dayOfWeek));
  const [startTime, setStartTime] = useState(initial.startTime?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(initial.endTime?.slice(0, 5) ?? "");
  const [category, setCategory] = useState(initial.category);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        priceCents: dollarsToCents(price),
        dayOfWeek: dayOfWeek === "" ? null : Number(dayOfWeek),
        startTime: startTime || null,
        endTime: endTime || null,
        category,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3 flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm resize-none"
      />
      <div className="flex flex-wrap gap-2">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price ($)"
          inputMode="decimal"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm w-28"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Every day</option>
          {DAY_LABELS.map((label, i) => (
            <option key={i} value={i}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-xs text-stale">{error}</p>}
      <button
        onClick={submit}
        disabled={saving}
        className="press-pill self-start rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

function SpecialRow({
  special,
  onSaved,
  onDeleted,
}: {
  special: SpecialData;
  onSaved: (id: number, data: Omit<SpecialData, "id">) => void;
  onDeleted: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function del() {
    setDeleting(true);
    const res = await fetch(`/api/owner/specials/${special.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(special.id);
    else setDeleting(false);
  }

  if (editing) {
    return (
      <SpecialForm
        initial={special}
        submitLabel="Save"
        onSubmit={async (data) => {
          const res = await fetch(`/api/owner/specials/${special.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? "Failed");
          onSaved(special.id, data);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground/90">{special.title}</span>
        <span className="text-xs text-muted">
          {[
            CATEGORY_LABELS[special.category] ?? special.category,
            formatPrice(special.priceCents),
            special.dayOfWeek === null ? "Every day" : DAY_LABELS[special.dayOfWeek],
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted"
        >
          Edit
        </button>
        <button
          onClick={del}
          disabled={deleting}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-stale disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function EventForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial: Omit<EventData, "id">;
  onSubmit: (data: Omit<EventData, "id">) => Promise<void>;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [eventType, setEventType] = useState(initial.eventType);
  const [dayOfWeek, setDayOfWeek] = useState(initial.dayOfWeek === null ? "" : String(initial.dayOfWeek));
  const [specificDate, setSpecificDate] = useState(initial.specificDate ?? "");
  const [startTime, setStartTime] = useState(initial.startTime?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(initial.endTime?.slice(0, 5) ?? "");
  const [coverCharge, setCoverCharge] = useState(centsToDollars(initial.coverChargeCents));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        eventType,
        dayOfWeek: dayOfWeek === "" ? null : Number(dayOfWeek),
        specificDate: specificDate || null,
        startTime: startTime || null,
        endTime: endTime || null,
        coverChargeCents: dollarsToCents(coverCharge),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3 flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm resize-none"
      />
      <div className="flex flex-wrap gap-2">
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={dayOfWeek}
          onChange={(e) => {
            setDayOfWeek(e.target.value);
            if (e.target.value !== "") setSpecificDate("");
          }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">One-off date</option>
          {DAY_LABELS.map((label, i) => (
            <option key={i} value={i}>
              Weekly {label}
            </option>
          ))}
        </select>
        {dayOfWeek === "" && (
          <input
            type="date"
            value={specificDate}
            onChange={(e) => setSpecificDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        )}
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          value={coverCharge}
          onChange={(e) => setCoverCharge(e.target.value)}
          placeholder="Cover ($)"
          inputMode="decimal"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm w-28"
        />
      </div>
      {error && <p className="text-xs text-stale">{error}</p>}
      <button
        onClick={submit}
        disabled={saving}
        className="press-pill self-start rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

function EventRow({
  event,
  onSaved,
  onDeleted,
}: {
  event: EventData;
  onSaved: (id: number, data: Omit<EventData, "id">) => void;
  onDeleted: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function del() {
    setDeleting(true);
    const res = await fetch(`/api/owner/events/${event.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(event.id);
    else setDeleting(false);
  }

  if (editing) {
    return (
      <EventForm
        initial={event}
        submitLabel="Save"
        onSubmit={async (data) => {
          const res = await fetch(`/api/owner/events/${event.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? "Failed");
          onSaved(event.id, data);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground/90">{event.title}</span>
        <span className="text-xs text-muted">
          {[
            EVENT_TYPE_LABELS[event.eventType] ?? event.eventType,
            event.dayOfWeek === null ? event.specificDate : `Weekly ${DAY_LABELS[event.dayOfWeek]}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted"
        >
          Edit
        </button>
        <button
          onClick={del}
          disabled={deleting}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-stale disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function MenuItemForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial: Omit<MenuItemData, "id">;
  onSubmit: (data: Omit<MenuItemData, "id">) => Promise<void>;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [price, setPrice] = useState(centsToDollars(initial.priceCents));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        priceCents: dollarsToCents(price),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3 flex flex-col gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm resize-none"
      />
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Price ($)"
        inputMode="decimal"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm w-28"
      />
      {error && <p className="text-xs text-stale">{error}</p>}
      <button
        onClick={submit}
        disabled={saving}
        className="press-pill self-start rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

function MenuItemRow({
  item,
  onSaved,
  onDeleted,
}: {
  item: MenuItemData;
  onSaved: (id: number, data: Omit<MenuItemData, "id">) => void;
  onDeleted: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function del() {
    setDeleting(true);
    const res = await fetch(`/api/owner/menu-items/${item.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(item.id);
    else setDeleting(false);
  }

  if (editing) {
    return (
      <MenuItemForm
        initial={item}
        submitLabel="Save"
        onSubmit={async (data) => {
          const res = await fetch(`/api/owner/menu-items/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? "Failed");
          onSaved(item.id, data);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground/90">{item.name}</span>
        {formatPrice(item.priceCents) && (
          <span className="text-xs text-muted">{formatPrice(item.priceCents)}</span>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted"
        >
          Edit
        </button>
        <button
          onClick={del}
          disabled={deleting}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-stale disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

const emptySpecial: Omit<SpecialData, "id"> = {
  title: "",
  description: null,
  priceCents: null,
  dayOfWeek: null,
  startTime: null,
  endTime: null,
  category: "food_special",
};

const emptyEvent: Omit<EventData, "id"> = {
  title: "",
  description: null,
  eventType: "live_music",
  dayOfWeek: null,
  specificDate: null,
  startTime: null,
  endTime: null,
  coverChargeCents: null,
};

const emptyMenuItem: Omit<MenuItemData, "id"> = { name: "", description: null, priceCents: null };

export function OwnerDashboard({
  specials,
  events,
  menuItems,
}: {
  specials: SpecialData[];
  events: EventData[];
  menuItems: MenuItemData[];
}) {
  const [specialList, setSpecialList] = useState(specials);
  const [eventList, setEventList] = useState(events);
  const [menuItemList, setMenuItemList] = useState(menuItems);

  return (
    <div className="flex flex-col gap-8">
      <SectionShell
        title="Specials"
        addForm={
          <SpecialForm
            initial={emptySpecial}
            submitLabel="Add special"
            onSubmit={async (data) => {
              const res = await fetch("/api/owner/specials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              const body = await res.json();
              if (!res.ok) throw new Error(body.error ?? "Failed");
              setSpecialList((prev) => [...prev, { id: body.id, ...data }]);
            }}
          />
        }
      >
        {specialList.length === 0 && <p className="text-sm text-muted-2">No specials yet.</p>}
        {specialList.map((s) => (
          <SpecialRow
            key={s.id}
            special={s}
            onSaved={(id, data) =>
              setSpecialList((prev) => prev.map((x) => (x.id === id ? { id, ...data } : x)))
            }
            onDeleted={(id) => setSpecialList((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </SectionShell>

      <SectionShell
        title="Events"
        addForm={
          <EventForm
            initial={emptyEvent}
            submitLabel="Add event"
            onSubmit={async (data) => {
              const res = await fetch("/api/owner/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              const body = await res.json();
              if (!res.ok) throw new Error(body.error ?? "Failed");
              setEventList((prev) => [...prev, { id: body.id, ...data }]);
            }}
          />
        }
      >
        {eventList.length === 0 && <p className="text-sm text-muted-2">No events yet.</p>}
        {eventList.map((e) => (
          <EventRow
            key={e.id}
            event={e}
            onSaved={(id, data) =>
              setEventList((prev) => prev.map((x) => (x.id === id ? { id, ...data } : x)))
            }
            onDeleted={(id) => setEventList((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </SectionShell>

      <SectionShell
        title="Menu"
        addForm={
          <MenuItemForm
            initial={emptyMenuItem}
            submitLabel="Add item"
            onSubmit={async (data) => {
              const res = await fetch("/api/owner/menu-items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              const body = await res.json();
              if (!res.ok) throw new Error(body.error ?? "Failed");
              setMenuItemList((prev) => [...prev, { id: body.id, ...data }]);
            }}
          />
        }
      >
        {menuItemList.length === 0 && <p className="text-sm text-muted-2">No menu items yet.</p>}
        {menuItemList.map((m) => (
          <MenuItemRow
            key={m.id}
            item={m}
            onSaved={(id, data) =>
              setMenuItemList((prev) => prev.map((x) => (x.id === id ? { id, ...data } : x)))
            }
            onDeleted={(id) => setMenuItemList((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </SectionShell>
    </div>
  );
}
