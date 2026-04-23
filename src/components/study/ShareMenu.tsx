import { Link2, Radio } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Props {
  notebookId: string;
  sessionId: string;
  shareToken: string | null;
  onGenerate: (notebookId: string) => Promise<string | null>;
}

const ShareMenu = ({ notebookId, sessionId, shareToken, onGenerate }: Props) => {
  const copyPrivateLink = async () => {
    const token = shareToken || (await onGenerate(notebookId));
    if (!token) {
      toast.error("Could not generate share link");
      return;
    }
    const url = `${window.location.origin}/study/shared/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Private link copied");
  };

  const copySessionLink = async () => {
    const url = `${window.location.origin}/live/${sessionId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Session link copied");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Link2 className="w-3.5 h-3.5" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={copyPrivateLink}>
          <Link2 className="w-3.5 h-3.5 mr-2" /> Copy private link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copySessionLink}>
          <Radio className="w-3.5 h-3.5 mr-2" /> Copy session record link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareMenu;