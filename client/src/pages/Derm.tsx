import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DermAppointment } from "@shared/schema";
import { APPT_TYPES } from "@shared/schema";
import { useState } from "react";
import { formatDate, toISODate, cn } from "@/lib/utils";
import { Plus, Sparkles, ChevronDown, ChevronUp, Trash2, CheckCircle, Clock } from "lucide-react";

function AppointmentCard({ appt, onUpdate, onDelete }: {
  appt: DermAppointment;
  onUpdate: (id: number, data: any) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(appt.status === "upcoming");
  const [editingPrep, setEditingPrep] = useState(false);
  const [editingVisit, setEditingVisit] = useState(false);
  const [prepDraft, setPrepDraft] = useState(appt.prepNotes || "");
  const [visitDraft, setVisitDraft] = useState(appt.visitNotes || "");
  const [followUpDraft, setFollowUpDraft] = useState(appt.followUpActions || "");
  const { toast } = useToast();

  const genPrepMutation = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", `/api/appointments/${appt.id}/generate-prep`, {}); return r.json(); },
    onSuccess: (data) => {
      setPrepDraft(data.prepNotes);
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Prep questions generated" });
    },
    onError: () => toast({ title: "Error", description: "AI unavailable", variant: "destructive" }),
  });

  const isPast = appt.date < toISODate(new Date());

  return (
    <Card className={cn(appt.status === "completed" ? "opacity-75" : "border-primary/20")}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {appt.status === "completed" ? <CheckCircle size={15} className="text-secondary shrink-0" /> : <Clock size={15} className="text-primary shrink-0" />}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{appt.type}</p>
              <p className="text-xs text-muted-foreground">{formatDate(appt.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant={appt.status === "upcoming" ? "default" : "secondary"} className="text-xs">{appt.status}</Badge>
            <button onClick={() => setExpanded(!expanded)} className="p-1 text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            {/* Prep notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Questions to Ask</p>
                <div className="flex gap-1.5">
                  {appt.status === "upcoming" && (
                    <Button size="sm" variant="outline" className="text-xs h-6 gap-1 px-2" onClick={() => genPrepMutation.mutate()} disabled={genPrepMutation.isPending} data-testid="button-gen-prep">
                      <Sparkles size={11} />{genPrepMutation.isPending ? "Generating…" : "AI Generate"}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => setEditingPrep(!editingPrep)}>Edit</Button>
                </div>
              </div>
              {editingPrep ? (
                <div className="space-y-2">
                  <Textarea value={prepDraft} onChange={e => setPrepDraft(e.target.value)} className="min-h-[120px] text-sm resize-none" />
                  <div className="flex gap-2">
                    <Button size="sm" className="text-xs h-7" onClick={() => { onUpdate(appt.id, { prepNotes: prepDraft }); setEditingPrep(false); }}>Save</Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setPrepDraft(appt.prepNotes || ""); setEditingPrep(false); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-foreground whitespace-pre-wrap rounded-lg bg-muted/50 p-3 min-h-[48px]">
                  {prepDraft || <span className="text-muted-foreground italic text-xs">No questions yet — click "AI Generate" to auto-generate from your recent logs, or add manually.</span>}
                </div>
              )}
            </div>

            {/* Visit notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visit Notes</p>
                <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => setEditingVisit(!editingVisit)}>Edit</Button>
              </div>
              {editingVisit ? (
                <div className="space-y-2">
                  <Textarea value={visitDraft} onChange={e => setVisitDraft(e.target.value)} placeholder="What did your derm say? New prescriptions, observations, changes..." className="min-h-[100px] text-sm resize-none" />
                  <Textarea value={followUpDraft} onChange={e => setFollowUpDraft(e.target.value)} placeholder="Follow-up actions / next steps..." className="min-h-[60px] text-sm resize-none" />
                  <div className="flex gap-2">
                    <Button size="sm" className="text-xs h-7" onClick={() => { onUpdate(appt.id, { visitNotes: visitDraft, followUpActions: followUpDraft, status: "completed" }); setEditingVisit(false); }}>Save &amp; Mark Complete</Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setEditingVisit(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-foreground whitespace-pre-wrap rounded-lg bg-muted/50 p-3 min-h-[40px]">
                    {visitDraft || <span className="text-muted-foreground italic text-xs">Record what your derm said, new prescriptions, observations...</span>}
                  </div>
                  {followUpDraft && (
                    <div className="text-sm text-foreground whitespace-pre-wrap rounded-lg bg-secondary/10 border border-secondary/20 p-3">
                      <p className="text-xs font-medium text-secondary mb-1">Follow-up actions</p>
                      {followUpDraft}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {appt.status === "upcoming" && (
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => onUpdate(appt.id, { status: "completed" })}>
                  <CheckCircle size={11} />Mark Complete
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-destructive ml-auto" onClick={() => onDelete(appt.id)} data-testid={`button-delete-${appt.id}`}>
                <Trash2 size={11} />Delete
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Derm() {
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [newDate, setNewDate] = useState(toISODate(new Date()));
  const [newType, setNewType] = useState("Checkup");

  const { data: appointments = [] } = useQuery<DermAppointment[]>({ queryKey: ["/api/appointments"] });

  const createMutation = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/appointments", { date: newDate, type: newType, status: "upcoming" }); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/appointments"] }); setShowNew(false); toast({ title: "Appointment added" }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const r = await apiRequest("PATCH", `/api/appointments/${id}`, data); return r.json(); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/appointments"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/appointments/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/appointments"] }),
  });

  const upcoming = appointments.filter(a => a.status === "upcoming").sort((a, b) => a.date.localeCompare(b.date));
  const completed = appointments.filter(a => a.status === "completed").sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl">Derm Appointments</h1>
        <Button size="sm" className="gap-1.5" onClick={() => setShowNew(!showNew)} data-testid="button-new-appt">
          <Plus size={14} />New
        </Button>
      </div>

      {showNew && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold">New Appointment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Date</label>
              <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} data-testid="input-appt-date" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Type</label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger data-testid="select-appt-type"><SelectValue /></SelectTrigger>
                <SelectContent>{APPT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="text-xs" onClick={() => createMutation.mutate()} disabled={createMutation.isPending} data-testid="button-save-appt">
                {createMutation.isPending ? "Saving..." : "Save Appointment"}
              </Button>
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</h2>
          {upcoming.map(a => (
            <AppointmentCard key={a.id} appt={a}
              onUpdate={(id, data) => updateMutation.mutate({ id, data })}
              onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past</h2>
          {completed.map(a => (
            <AppointmentCard key={a.id} appt={a}
              onUpdate={(id, data) => updateMutation.mutate({ id, data })}
              onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}

      {appointments.length === 0 && !showNew && (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-3 text-center">
            <p className="text-muted-foreground text-sm">No appointments yet.</p>
            <Button variant="outline" size="sm" onClick={() => setShowNew(true)}><Plus size={13} className="mr-1" />Add your first appointment</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
