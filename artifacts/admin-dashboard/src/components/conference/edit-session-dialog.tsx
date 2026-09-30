import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListConferenceSessionsQueryKey, useUpdateConferenceSession } from "@workspace/api-client-react";
import type { Session, Speaker } from "@workspace/api-client-react";
import { useAdmin } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EditSessionDialog({ session, speakers, conferenceId, onClose }: {
  session: Session; speakers: Speaker[]; conferenceId: number; onClose: () => void;
}) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(session.title);
  const [description, setDescription] = useState(session.description ?? "");
  const [day, setDay] = useState(session.day ?? "");
  const [startTime, setStartTime] = useState(session.start_time ?? "");
  const [endTime, setEndTime] = useState(session.end_time ?? "");
  const [room, setRoom] = useState(session.room ?? "");
  const [track, setTrack] = useState(session.track ?? "");
  const [speakerIds, setSpeakerIds] = useState(session.speaker_ids ?? []);
  const update = useUpdateConferenceSession({ request: { headers: { "X-Admin-Pin": pin || "" } } });
  const toggleSpeaker = (id: string) => setSpeakerIds((ids) =>
    ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);

  const save = (event: FormEvent) => {
    event.preventDefault();
    update.mutate({
      id: conferenceId, sessionId: session.id,
      data: {
        title: title.trim(), description: description.trim() || null, day: day.trim() || null,
        startTime: startTime || null, endTime: endTime || null, room: room.trim() || null,
        track: track.trim() || null, speakerIds,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListConferenceSessionsQueryKey(conferenceId) });
        toast({ title: "Session saved" });
        onClose();
      },
      onError: () => toast({ variant: "destructive", title: "Could not save session" }),
    });
  };

  return <Dialog open onOpenChange={(open) => { if (!open && !update.isPending) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Edit session</DialogTitle></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="session-title">Title</Label><Input id="session-title" required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="session-description">Description</Label><Textarea id="session-description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="session-day">Day</Label><Input id="session-day" value={day} onChange={(e) => setDay(e.target.value)} placeholder="Monday" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="session-start">Start time</Label><Input id="session-start" type="time" value={startTime.slice(0, 5)} onChange={(e) => setStartTime(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="session-end">End time</Label><Input id="session-end" type="time" value={endTime.slice(0, 5)} onChange={(e) => setEndTime(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="session-room">Room</Label><Input id="session-room" value={room} onChange={(e) => setRoom(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="session-track">Track</Label><Input id="session-track" value={track} onChange={(e) => setTrack(e.target.value)} /></div>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Speakers</legend>
          <div className="max-h-36 overflow-y-auto rounded-md border p-3 space-y-2">
            {speakers.length ? speakers.map((speaker) => <label key={speaker.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={speakerIds.includes(speaker.external_id)} onChange={() => toggleSpeaker(speaker.external_id)} />
              {speaker.name}
            </label>) : <p className="text-sm text-muted-foreground">No speakers available. Import speakers first.</p>}
            {speakerIds.filter((id) => !speakers.some((s) => s.external_id === id)).map((id) =>
              <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked onChange={() => toggleSpeaker(id)} />Unknown speaker ID: {id}
              </label>)}
          </div>
        </fieldset>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={update.isPending} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={update.isPending || !title.trim()}>{update.isPending ? "Saving…" : "Save session"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}