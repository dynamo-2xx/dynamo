import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { makeQrDataUrl } from "@/lib/qr";

const JoinCodeProjectorPage = () => {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("debates")
        .select("topic, join_code")
        .eq("id", id)
        .single();
      if (cancelled || !data) return;
      setTopic(data.topic || "");
      setCode(data.join_code || "");
      if (data.join_code) {
        const url = `${window.location.origin}/join/${data.join_code}`;
        try {
          const dataUrl = await makeQrDataUrl(url, 720);
          if (!cancelled) setQr(dataUrl);
        } catch {
          /* noop */
        }
      }
    };

    load();

    // Live-refresh if creator regenerates code in another tab
    const channel = supabase
      .channel(`project-code-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "debates", filter: `id=eq.${id}` },
        (payload) => {
          const next: any = payload.new;
          if (next?.join_code && next.join_code !== code) {
            setCode(next.join_code);
            const url = `${window.location.origin}/join/${next.join_code}`;
            makeQrDataUrl(url, 720).then((d) => setQr(d)).catch(() => undefined);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-5xl text-center space-y-12">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-body mb-4">Join the debate</p>
          <h1 className="font-display text-3xl md:text-5xl text-foreground leading-tight">{topic || "Loading…"}</h1>
        </div>
        <div className="grid md:grid-cols-2 gap-12 items-center justify-items-center">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-body">Code</p>
            <p className="font-mono text-7xl md:text-9xl font-bold tracking-[0.15em] text-foreground">
              {code || "—"}
            </p>
            <p className="text-sm text-muted-foreground font-body">
              Open <span className="text-foreground font-mono">{window.location.host}/join/{code || "…"}</span>
            </p>
          </div>
          {qr && (
            <div className="bg-white p-4 rounded-2xl shadow-lg">
              <img src={qr} alt="QR code to join" className="w-72 h-72 md:w-96 md:h-96" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinCodeProjectorPage;