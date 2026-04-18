import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface AuthPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

const AuthPromptDialog = ({
  open,
  onOpenChange,
  title = "Create an account to continue",
  description = "Sign up or log in to start a debate or capture a live conversation.",
}: AuthPromptDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          <DialogDescription className="font-body">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <Link
            to="/auth"
            onClick={() => onOpenChange(false)}
            className="w-full text-center px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-body hover:opacity-90 transition-opacity"
          >
            Sign up
          </Link>
          <Link
            to="/auth"
            onClick={() => onOpenChange(false)}
            className="w-full text-center px-4 py-2.5 rounded-full border border-border text-sm font-body hover:border-foreground/30 transition-colors"
          >
            Log in
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthPromptDialog;
