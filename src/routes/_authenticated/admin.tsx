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

type SortKey = "created_at" | "full_name" | "guest_count" | "attendance";

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const role = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
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
      if (!count) throw new Error("Not deleted");
    },
    onSuccess: () => { toast.success("RSVP deleted"); qc.invalidateQueries({ queryKey: ["rsvps"] }); },
    onError: () => toast.error("Could not delete RSVP"),
  });

  const save = useMutation({
    mutationFn: async (r: Rsvp) => {
      const { error } = await supabase.from("rsvps").update({
        full_name: r.full_name, phone: r.phone, email: r.email || null, attendance: r.attendance,
        guest_count: r.attendance === "not_attending" ? 0 : r.guest_count,
        additional_guests: r.additional_guests || null, dietary: r.dietary || null,
        accessibility: r.accessibility || null, message: r.message || null,
      }).eq("id", r.id).select("id").single();
      if (error) throw error;
    },
    onSuccess: () => { toast.success("RSVP updated"); setEditing(null); qc.invalidateQueries({ queryKey: ["rsvps"] }); },
    onError: () => toast.error("Could not update RSVP"),
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

  if (role.isLoading) return <p className="p-10 text-center text-muted-foreground">Checking access…</p>;
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
            <p className="mt-1 font-display text-3xl">{rsvps.isLoading ? "…" : v}</p>
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
          <p className="p-6 text-center text-destructive">Could not load RSVPs.</p>
        ) : rsvps.isLoading ? (
          <p className="p-6 text-center text-muted-foreground">Loading…</p>
        ) : !rows.length ? (
          <p className="p-6 text-center text-muted-foreground">No RSVPs found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary"><tr>{th("full_name", "Name")}<th className="px-3 py-2 text-left font-medium">Phone</th>{th("attendance", "Status")}{th("guest_count", "Guests")}{th("created_at", "Submitted")}<th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">{r.full_name}</td>
                  <td className="px-3 py-2">{r.phone}</td>
                  <td className="px-3 py-2">{ATTENDANCE_LABELS[r.attendance]}</td>
                  <td className="px-3 py-2">{r.guest_count}</td>
                  <td className="px-3 py-2">{new Date(r.created_at).toLocaleDateString("en-ZA")}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button className="mr-2 text-gold underline" onClick={() => setViewing(r)}>View</button>
                    <button className="mr-2 underline" onClick={() => setEditing({ ...r })}>Edit</button>
                    <button className="text-destructive underline" onClick={() => setDeleting(r)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SettingsEditor />

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
                <div key={k}><Label>{k.replace("_", " ")}</Label><Input value={editing[k] ?? ""} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} /></div>
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
    onError: () => toast.error("Could not save event details"),
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
