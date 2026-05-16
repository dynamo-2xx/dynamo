import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link2, Trash2, Search, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  useRecordSharing, searchUsersForSharing,
  type ShareableRecordType, type ShareRole, type ProfileCard
} from "@/hooks/useRecordSharing";

interface Props {
  type: ShareableRecordType;
  recordId: string;
  isCreator: boolean;
  trigger?: React.ReactNode;
}

const ShareDialog = ({ type, recordId, isCreator, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const { shares, profiles, shareWithUser, removeShare, generateLink, refresh } =
    useRecordSharing(type, open ? recordId : null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileCard[]>([]);
  const [role, setRole] = useState<ShareRole>("viewer");
  const [linkRole, setLinkRole] = useState<ShareRole>("viewer");
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    if (!query) { setResults([]); return; }
    const t = setTimeout(async () => setResults(await searchUsersForSharing(query)), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Link2 className="w-3.5 h-3.5" /> Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Share this record</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="people" className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="people">People ({shares.length})</TabsTrigger>
            <TabsTrigger value="invite" disabled={!isCreator}>Invite</TabsTrigger>
            <TabsTrigger value="link" disabled={!isCreator}>Get link</TabsTrigger>
          </TabsList>

          <TabsContent value="people" className="mt-4 space-y-2 max-h-80 overflow-y-auto">
            {shares.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No one else has access yet.</p>
            )}
            {shares.map((s) => {
              const p = profiles[s.user_id];
              return (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-md border border-border">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={p?.avatar_url || undefined} />
                    <AvatarFallback>{(p?.display_name || "?")[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p?.display_name || "Unknown user"}</p>
                    <p className="text-xs text-muted-foreground truncate">{p?.affiliation || ""}</p>
                  </div>
                  <Badge variant={s.role === "co_owner" ? "default" : "secondary"} className="text-[10px]">
                    {s.role === "co_owner" ? "Co-owner" : "Viewer"}
                  </Badge>
                  {isCreator && (
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => removeShare(s.user_id)}>
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="invite" className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by name or affiliation" className="pl-9"
                  value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Select value={role} onValueChange={(v) => setRole(v as ShareRole)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="co_owner">Co-owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {results.map((r) => (
                <button key={r.user_id}
                  onClick={() => { shareWithUser(r.user_id, role); setQuery(""); setResults([]); }}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted text-left">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={r.avatar_url || undefined} />
                    <AvatarFallback>{(r.display_name || "?")[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 truncate">{r.display_name}</span>
                  <span className="text-xs text-muted-foreground">{r.affiliation}</span>
                </button>
              ))}
              {query && results.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">No matches</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="link" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Anyone with this link can claim {linkRole === "co_owner" ? "co-owner" : "viewer"} access. Expires in 30 days.
            </p>
            <div className="flex items-center gap-2">
              <Select value={linkRole} onValueChange={(v) => { setLinkRole(v as ShareRole); setLink(null); }}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="co_owner">Co-owner</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={async () => setLink(await generateLink(linkRole))}>
                Generate link
              </Button>
            </div>
            {link && (
              <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/40">
                <code className="text-xs flex-1 truncate">{link}</code>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;