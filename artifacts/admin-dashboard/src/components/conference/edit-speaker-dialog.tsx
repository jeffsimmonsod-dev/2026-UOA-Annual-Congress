import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListConferenceSpeakersQueryKey, useUpdateConferenceSpeaker } from "@workspace/api-client-react";
import type { Speaker } from "@workspace/api-client-react";
import { useAdmin } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EditSpeakerDialog({ speaker, conferenceId, onClose }: {
  speaker: Speaker; conferenceId: number; onClose: () => void;
}) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(speaker.name);
  const [title, setTitle] = useState(speaker.title ?? "");
  const [bio, setBio] = useState(speaker.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(speaker.photo_url ?? "");
  const update = useUpdateConferenceSpeaker({ request: { headers: { "X-Admin-Pin": pin || "" } } });

  const save = (event: FormEvent) => {
    event.preventDefault();
    update.mutate({
      id: conferenceId, speakerId: speaker.id,
      data: { name: name.trim(), title: title.trim() || null, bio: bio.trim() || null, photoUrl: photoUrl.trim() || null },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListConferenceSpeakersQueryKey(conferenceId) });
        toast({ title: "Speaker saved" });
        onClose();
      },
      onError: () => toast({ variant: "destructive", title: "Could not save speaker" }),
    });
  };

  return <Dialog open onOpenChange={(open) => { if (!open && !update.isPending) onClose(); }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Edit speaker</DialogTitle></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="speaker-name">Name</Label><Input id="speaker-name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="speaker-title">Title</Label><Input id="speaker-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="speaker-bio">Bio</Label><Textarea id="speaker-bio" value={bio} onChange={(e) => setBio(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="speaker-photo">Photo URL</Label><Input id="speaker-photo" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" /></div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={update.isPending} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={update.isPending || !name.trim()}>{update.isPending ? "Saving…" : "Save speaker"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}