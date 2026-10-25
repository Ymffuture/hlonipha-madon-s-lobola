import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ATTENDANCE_LABELS, computeStats, eventSettingsQuery, fromJhbLocalInput, rsvpsToCsv, toJhbLocalInput,
  type Attendance, type EventSettings, type Rsvp,
} from "@/lib/event";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { FullPageLoader, MonogramLoader } from "@/components/invite/MonogramLoader";
import { useLongPress } from "@/hooks/use-long-press";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Guest dashboard — H & M Lobola" },
      { name: "description", content: "Private RSVP dashboard." },
      { property: "og:title", content: "Guest dashboard — H & M Lobola" },
      { property: "og:description", content: "Private RSVP dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

/** Same rule as the SQL submit_rsvp(): digits only, +27xxxxxxxxx -> 0xxxxxxxxx */
function normalizePhone(phone: string) {
  let n = phone.replace(/\D/g, "");
  if (n.startsWith("27") && n.length === 11) n = "0" + n.slice(2);
  return n;
}

type SortKey = "created_at" | "full_name" | "guest_count" | "attendance";

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const role = useQuery({
    queryKey: ["is-admin"],
    retry: false,
    queryFn: async () => {
      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      if (!u.user) return false;
      const { data, error } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (error) throw error;
      return !!data;
    },
  });

  const rsvps = useQuery({
    queryKey: ["rsvps"],
    enabled: role.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("rsvps").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Rsvp[];
    },
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Attendance | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "created_at", asc: false });
  const [viewing, setViewing] = useState<Rsvp | null>(null);
  const [editing, setEditing] = useState<Rsvp | null>(null);
  const [deleting, setDeleting] = useState<Rsvp | null>(null);
  const [acting, setActing] = useState<Rsvp | null>(null); // long-press action sheet

  /** Close the action sheet first, then open the chosen dialog (avoids two overlays fighting for focus). */
  function pick(action: "view" | "edit" | "delete") {
    const r = acting;
    setActing(null);
    if (!r) return;
    setTimeout(() => {
      if (action === "view") setViewing(r);
      else if (action === "edit") setEditing({ ...r });
      else setDeleting(r);
    }, 120);
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rsvps.data ?? [])
      .filter((r) => filter === "all" || r.attendance === filter)
      .filter((r) => !q || [r.full_name, r.phone, r.email, r.additional_guests].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => {
        const av = a[sort.key], bv = b[sort.key];
        const c = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.asc ? c : -c;
      });
  }, [rsvps.data, search, filter, sort]);

  const stats = computeStats(rsvps.data ?? []);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase.from("rsvps").delete({ count: "exact" }).eq("id", id);
      if (error) throw error;
      if (!count) throw new Error("Not deleted (are you signed in as an admin?)");
    },
    onSuccess: () => { toast.success("RSVP deleted"); setDeleting(null); qc.invalidateQueries({ queryKey: ["rsvps"] }); },
    onError: (e: Error) => toast.error(`Could not delete RSVP: ${e.message}`),
  });

  const save = useMutation({
    mutationFn: async (r: Rsvp) => {
      const { error } = await supabase.from("rsvps").update({
        full_name: r.full_name.trim(), phone: r.phone.trim(), phone_normalized: normalizePhone(r.phone),
        email: r.email || null, attendance: r.attendance,
        guest_count: r.attendance === "not_attending" ? 0 : r.guest_count,
        additional_guests: r.additional_guests || null, dietary: r.dietary || null,
        accessibility: r.accessibility || null, message: r.message || null,
      }).eq("id", r.id).select("id").single();
      if (error) throw error;
    },
    onSuccess: () => { toast.success("RSVP updated"); setEditing(null); qc.invalidateQueries({ queryKey: ["rsvps"] }); },
    onError: (e: { code?: string; message?: string }) =>
      toast.error(e?.code === "23505" ? "Another RSVP already uses that phone number" : `Could not update RSVP${e?.message ? `: ${e.message}` : ""}`),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function exportCsv() {
    const blob = new Blob([rsvpsToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lobola-rsvps-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (role.isLoading) return <FullPageLoader label="Checking access…" />;
  if (role.isError)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl">Could not check access</h1>
        <p className="max-w-md text-muted-foreground">
          {role.error instanceof Error ? role.error.message : "Unknown error"}. This usually means the database
          setup has not been run in Supabase yet (see SUPABASE_SETUP.md).
        </p>
        <div className="flex gap-2">
          <button onClick={() => role.refetch()} className="rounded-full border border-input px-6 py-2 text-sm">Try again</button>
          <button onClick={signOut} className="rounded-full bg-primary px-6 py-2 text-sm text-primary-foreground">Sign out</button>
        </div>
      </main>
    );
  if (!role.data)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl">Not authorised</h1>
        <p className="text-muted-foreground">This account does not have administrator access.</p>
        <button onClick={signOut} className="rounded-full bg-primary px-6 py-2 text-sm text-primary-foreground">Sign out</button>
      </main>
    );

  const th = (key: SortKey, label: string) => (
    <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }))}>
      {label}{sort.key === key ? (sort.asc ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl">Guest dashboard</h1>
        <div className="flex gap-2">
          <button onClick={exportCsv} disabled={!rows.length} className="rounded-full border border-input px-4 py-2 text-sm disabled:opacity-50">Export CSV</button>
          <button onClick={signOut} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Sign out</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[["Responses", stats.responses], ["Attending RSVPs", stats.attendingResponses], ["Expected guests", stats.expected], ["Declined", stats.declines], ["Undecided", stats.undecided]].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{l}</p>
            <p className="mt-1 font-display text-3xl">{rsvps.isLoading ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-secondary align-middle" /> : v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search name, phone, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-card" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as Attendance | "all")} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
          <option value="all">All statuses</option>
          {Object.entries(ATTENDANCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {rsvps.isError ? (
          <p className="p-6 text-center text-destructive">Could not load RSVPs: {rsvps.error instanceof Error ? rsvps.error.message : "unknown error"}</p>
        ) : rsvps.isLoading ? (
          <div className="flex justify-center p-10"><MonogramLoader size="sm" label="Loading RSVPs…" /></div>
        ) : !rows.length ? (
          <p className="p-6 text-center text-muted-foreground">No RSVPs found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary"><tr>{th("full_name", "Name")}<th className="px-3 py-2 text-left font-medium">Phone</th>{th("attendance", "Status")}{th("guest_count", "Guests")}{th("created_at", "Submitted")}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <RsvpRow key={r.id} r={r} onView={() => setViewing(r)} onActions={() => setActing(r)} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rows.length > 0 && (
        <p className="-mt-4 text-center text-xs text-muted-foreground">
          Tap a guest to view their RSVP. Press and hold (or right-click) for Edit and Delete.
        </p>
      )}

      <SettingsEditor />

      <Sheet open={!!acting} onOpenChange={(o) => !o && setActing(null)}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-md rounded-t-2xl pb-8">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">{acting?.full_name}</SheetTitle>
            <SheetDescription>{acting?.phone} · {acting && ATTENDANCE_LABELS[acting.attendance]}</SheetDescription>
          </SheetHeader>
          <div className="mt-5 grid gap-2">
            <button onClick={() => pick("view")} className="flex items-center gap-3 rounded-xl border border-input px-4 py-3 text-left text-sm transition hover:border-gold">
              <Eye className="h-4 w-4 text-gold" /> View details
            </button>
            <button onClick={() => pick("edit")} className="flex items-center gap-3 rounded-xl border border-input px-4 py-3 text-left text-sm transition hover:border-gold">
              <Pencil className="h-4 w-4 text-gold" /> Edit RSVP
            </button>
            <button onClick={() => pick("delete")} className="flex items-center gap-3 rounded-xl border border-destructive/40 px-4 py-3 text-left text-sm text-destructive transition hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" /> Delete RSVP
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewing?.full_name}</DialogTitle></DialogHeader>
          {viewing && (
            <dl className="space-y-2 text-sm">
              {[["Phone", viewing.phone], ["Email", viewing.email], ["Status", ATTENDANCE_LABELS[viewing.attendance]], ["Guests", viewing.guest_count], ["Additional guests", viewing.additional_guests], ["Dietary", viewing.dietary], ["Accessibility", viewing.accessibility], ["Message", viewing.message], ["Submitted", new Date(viewing.created_at).toLocaleString("en-ZA")]].map(([k, v]) => (
                <div key={String(k)}><dt className="text-xs uppercase text-muted-foreground">{k}</dt><dd className="whitespace-pre-wrap">{v || "—"}</dd></div>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit RSVP</DialogTitle></DialogHeader>
          {editing && (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(editing); }}>
              {(["full_name", "phone", "email", "additional_guests", "dietary", "accessibility", "message"] as const).map((k) => (
                <div key={k}><Label className="capitalize">{k.replace(/_/g, " ")}</Label><Input value={editing[k] ?? ""} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} /></div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Status</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={editing.attendance} onChange={(e) => setEditing({ ...editing, attendance: e.target.value as Attendance })}>
                    {Object.entries(ATTENDANCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div><Label>Guests</Label><Input type="number" min={0} max={50} value={editing.guest_count} onChange={(e) => setEditing({ ...editing, guest_count: Number(e.target.value) })} /></div>
              </div>
              <button disabled={save.isPending} className="w-full rounded-full bg-primary py-2 text-sm text-primary-foreground disabled:opacity-60">{save.isPending ? "Saving…" : "Save changes"}</button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this RSVP?</AlertDialogTitle>
            <AlertDialogDescription>{deleting?.full_name}'s response will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && del.mutate(deleting.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

/** One table row. Tap = view; press-and-hold / right-click / context-menu key = Edit & Delete sheet. */
function RsvpRow({ r, onView, onActions }: { r: Rsvp; onView: () => void; onActions: () => void }) {
  const { handlers, pressing, ms } = useLongPress(onActions, onView);
  return (
    <tr
      {...handlers}
      tabIndex={0}
      aria-label={`${r.full_name}. Press Enter to view. Press and hold, or use the context menu key, for edit and delete.`}
      style={{ ["--lp-ms" as string]: `${ms}ms` }}
      className={cn(
        "cursor-pointer select-none border-t border-border outline-none transition-colors [-webkit-touch-callout:none] hover:bg-secondary/60 focus-visible:bg-secondary/80 md:select-text",
        pressing && "lp-pressing",
      )}
    >
      <td className="px-3 py-3 font-medium">{r.full_name}</td>
      <td className="px-3 py-3">{r.phone}</td>
      <td className="px-3 py-3">{ATTENDANCE_LABELS[r.attendance]}</td>
      <td className="px-3 py-3">{r.guest_count}</td>
      <td className="px-3 py-3">{new Date(r.created_at).toLocaleDateString("en-ZA")}</td>
    </tr>
  );
}

function SettingsEditor() {
  const qc = useQueryClient();
  const { data } = useQuery(eventSettingsQuery());
  const [s, setS] = useState<EventSettings | null>(null);
  const cur = s ?? data ?? null;
  const save = useMutation({
    mutationFn: async (v: EventSettings) => {
      const { id: _id, updated_at: _u, ...rest } = v;
      const { error } = await supabase.from("event_settings").update({ ...rest, hero_video_url: rest.hero_video_url || null }).eq("id", 1).select("id").single();
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Event details saved"); setS(null); qc.invalidateQueries({ queryKey: ["event-settings"] }); },
    onError: (e: Error) => toast.error(`Could not save event details: ${e.message}`),
  });
  if (!cur) return null;
  const text = (k: keyof EventSettings, label: string) => (
    <div><Label>{label}</Label><Input value={String(cur[k] ?? "")} onChange={(e) => setS({ ...cur, [k]: e.target.value })} /></div>
  );
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 text-3xl">Event settings</h2>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(cur); }}>
        {text("couple_names", "Couple names")}{text("monogram", "Monogram")}{text("event_name", "Event name")}
        <div><Label>Date & time (Johannesburg)</Label><Input type="datetime-local" value={toJhbLocalInput(cur.event_datetime)} onChange={(e) => e.target.value && setS({ ...cur, event_datetime: fromJhbLocalInput(e.target.value) })} /></div>
        {text("venue", "Venue")}{text("dress_code", "Dress code")}{text("rsvp_contact", "RSVP contact")}{text("hero_video_url", "Hero video URL (blank = default)")}
        <div><Label>Maximum guests per RSVP</Label><Input type="number" min={1} max={50} value={cur.max_guests} onChange={(e) => setS({ ...cur, max_guests: Number(e.target.value) })} /></div>
        <div className="flex gap-3">
          {(["color_ivory", "color_brown", "color_gold", "color_beige"] as const).map((k) => (
            <label key={k} className="text-xs">{k.replace("color_", "")}<input type="color" className="block h-9 w-12" value={cur[k]} onChange={(e) => setS({ ...cur, [k]: e.target.value })} /></label>
          ))}
        </div>
        <div className="sm:col-span-2"><Label>Welcome message</Label><Textarea rows={4} value={cur.welcome_message} onChange={(e) => setS({ ...cur, welcome_message: e.target.value })} /></div>
        <button disabled={save.isPending || !s} className="rounded-full bg-primary py-2 text-sm text-primary-foreground disabled:opacity-50 sm:col-span-2">{save.isPending ? "Saving…" : "Save event settings"}</button>
      </form>
    </section>
  );
}
