import { Textarea } from "@/components/ui/textarea";

interface Props {
  thoughts: string;
  setThoughts: (v: string) => void;
}

const ThoughtsTab = ({ thoughts, setThoughts }: Props) => {
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setThoughts(thoughts + `\n\n![pasted image](${dataUrl})\n\n`);
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  };

  return (
    <Textarea
      value={thoughts}
      onChange={(e) => setThoughts(e.target.value)}
      onPaste={handlePaste}
      placeholder="Free-form thoughts. Paste images directly…"
      className="w-full h-full min-h-[240px] resize-none border-foreground/10 text-sm font-body"
    />
  );
};

export default ThoughtsTab;