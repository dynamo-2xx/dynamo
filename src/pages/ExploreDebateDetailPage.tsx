import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, MessageSquare, Clock, Shield, ChevronDown, ArrowRight, Quote } from "lucide-react";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import RecordCommentsSection from "@/components/comments/RecordCommentsSection";

/* ── Mock data ── */

interface MockArgument {
  id: string;
  content: string;
  argumentType: "opening" | "counter" | "quote";
  sideLabel: string;
  sideOrder: number;
  parentArgumentId: string | null;
  isEdited: boolean;
}

interface MockSubtopic {
  id: string;
  title: string;
  arguments: MockArgument[];
}

interface MockDebateDetail {
  id: string;
  topic: string;
  description: string;
  date: string;
  participants: number;
  totalArguments: number;
  community?: string;
  verified?: boolean;
  status: "live" | "completed" | "scheduled";
  gradientFrom: string;
  gradientTo: string;
  subtopics: MockSubtopic[];
}

const MOCK_DEBATES: Record<string, MockDebateDetail> = {
  "featured-1": {
    id: "featured-1",
    topic: "Should our city invest in a new light rail line?",
    description: "A heated local debate with verified council members weighing in on transit infrastructure. The proposed $2.4B project would connect downtown to the eastern suburbs, potentially reshaping commute patterns for 120,000 residents.",
    date: "5h ago",
    participants: 8,
    totalArguments: 34,
    community: "Portland City Council",
    verified: true,
    status: "live",
    gradientFrom: "#1a1a2e",
    gradientTo: "#16213e",
    subtopics: [
      {
        id: "s1",
        title: "Infrastructure Costs",
        arguments: [
          { id: "a1", content: "The $2.4 billion estimate doesn't account for inevitable cost overruns. Historical data from similar projects shows an average 40% budget increase.", argumentType: "opening", sideLabel: "Against", sideOrder: 1, parentArgumentId: null, isEdited: false },
          { id: "a2", content: "Federal matching funds would cover 50% of the cost, making the city's actual burden $1.2B spread over 15 years — roughly $80M annually.", argumentType: "counter", sideLabel: "For", sideOrder: 0, parentArgumentId: "a1", isEdited: false },
          { id: "a3", content: "That $80M annually is still money diverted from schools and emergency services. We need to prioritize existing infrastructure maintenance.", argumentType: "counter", sideLabel: "Against", sideOrder: 1, parentArgumentId: "a2", isEdited: false },
          { id: "a4", content: "Light rail systems generate $4 in economic activity for every $1 invested, according to the American Public Transportation Association.", argumentType: "opening", sideLabel: "For", sideOrder: 0, parentArgumentId: null, isEdited: false },
          { id: "a5", content: "Those APTA figures are based on dense urban cores, not suburban corridors like ours.", argumentType: "counter", sideLabel: "Against", sideOrder: 1, parentArgumentId: "a4", isEdited: true },
        ],
      },
      {
        id: "s2",
        title: "Environmental Impact",
        arguments: [
          { id: "a6", content: "Each light rail car removes approximately 75 cars from the road during peak hours, significantly reducing carbon emissions in our corridor.", argumentType: "opening", sideLabel: "For", sideOrder: 0, parentArgumentId: null, isEdited: false },
          { id: "a7", content: "Construction alone would generate 180,000 metric tons of CO2. The environmental break-even point is estimated at 12 years post-completion.", argumentType: "counter", sideLabel: "Against", sideOrder: 1, parentArgumentId: "a6", isEdited: false },
          { id: "a8", content: "A 12-year payback on a 50+ year infrastructure asset is excellent. We need to think in decades, not election cycles.", argumentType: "counter", sideLabel: "For", sideOrder: 0, parentArgumentId: "a7", isEdited: false },
        ],
      },
      {
        id: "s3",
        title: "Community Displacement",
        arguments: [
          { id: "a9", content: "The proposed route would require demolition of 47 residential properties and displacement of approximately 200 residents.", argumentType: "opening", sideLabel: "Against", sideOrder: 1, parentArgumentId: null, isEdited: false },
          { id: "a10", content: "The relocation package offers 120% of market value plus moving assistance. Comparable projects in Denver showed 94% resident satisfaction post-relocation.", argumentType: "counter", sideLabel: "For", sideOrder: 0, parentArgumentId: "a9", isEdited: false },
          { id: "a11", content: "You can't put a price on uprooting families from neighborhoods they've lived in for generations. Community bonds aren't fungible.", argumentType: "counter", sideLabel: "Against", sideOrder: 1, parentArgumentId: "a10", isEdited: false },
          { id: "a12", content: "Property values within a half-mile of light rail stations increase 10–25% on average, benefiting remaining homeowners.", argumentType: "opening", sideLabel: "For", sideOrder: 0, parentArgumentId: null, isEdited: false },
        ],
      },
      {
        id: "s4",
        title: "Economic Benefits",
        arguments: [
          { id: "a13", content: "Transit-oriented development around stations could create an estimated 3,200 permanent jobs and $450M in new commercial investment.", argumentType: "opening", sideLabel: "For", sideOrder: 0, parentArgumentId: null, isEdited: false },
          { id: "a14", content: "Those job projections are speculative. The city's last two major transit projects underperformed economic forecasts by 35%.", argumentType: "counter", sideLabel: "Against", sideOrder: 1, parentArgumentId: "a13", isEdited: false },
          { id: "a15", content: "The previous projects didn't include the zoning reforms we've now passed. The regulatory environment is fundamentally different.", argumentType: "counter", sideLabel: "For", sideOrder: 0, parentArgumentId: "a14", isEdited: false },
        ],
      },
    ],
  },
  "featured-2": {
    id: "featured-2",
    topic: "Is AI art real art?",
    description: "Artists and technologists clash over the boundaries of creativity in the age of generative AI. This debate explores authorship, intentionality, and whether the medium defines the art.",
    date: "12h ago",
    participants: 12,
    totalArguments: 67,
    status: "live",
    gradientFrom: "#0f3460",
    gradientTo: "#533483",
    subtopics: [
      {
        id: "s5",
        title: "Authorship & Intentionality",
        arguments: [
          { id: "b1", content: "Art requires intentional creative decisions. Typing a prompt and selecting from outputs is curation, not creation.", argumentType: "opening", sideLabel: "Against AI Art", sideOrder: 1, parentArgumentId: null, isEdited: false },
          { id: "b2", content: "Photography was dismissed as 'not real art' for the same reason — the camera does the work. Intent lives in the concept, not the manual labor.", argumentType: "counter", sideLabel: "For AI Art", sideOrder: 0, parentArgumentId: "b1", isEdited: false },
          { id: "b3", content: "Photographers compose shots, control lighting, and make hundreds of micro-decisions. A prompt is a single macro-decision.", argumentType: "counter", sideLabel: "Against AI Art", sideOrder: 1, parentArgumentId: "b2", isEdited: false },
        ],
      },
      {
        id: "s6",
        title: "Impact on Working Artists",
        arguments: [
          { id: "b4", content: "AI art generators are trained on copyrighted works without consent or compensation. This is exploitation of human creativity.", argumentType: "opening", sideLabel: "Against AI Art", sideOrder: 1, parentArgumentId: null, isEdited: false },
          { id: "b5", content: "AI art democratizes visual expression for people who lack traditional skills but have compelling ideas to communicate.", argumentType: "opening", sideLabel: "For AI Art", sideOrder: 0, parentArgumentId: null, isEdited: false },
        ],
      },
      {
        id: "s7",
        title: "Defining Art in 2026",
        arguments: [
          { id: "b6", content: "Art has always been defined by the response it evokes, not the tool used. If AI art moves people, it's art.", argumentType: "opening", sideLabel: "For AI Art", sideOrder: 0, parentArgumentId: null, isEdited: false },
          { id: "b7", content: "If we remove human suffering, practice, and growth from art-making, we lose the very thing that makes art meaningful.", argumentType: "counter", sideLabel: "Against AI Art", sideOrder: 1, parentArgumentId: "b6", isEdited: false },
        ],
      },
    ],
  },
  "trending-1": {
    id: "trending-1",
    topic: "Should voting be mandatory?",
    description: "Exploring whether compulsory voting strengthens democracy or infringes on personal freedom. Drawing comparisons from Australia, Belgium, and other nations with mandatory voting laws.",
    date: "1 day ago",
    participants: 6,
    totalArguments: 42,
    status: "completed",
    gradientFrom: "#2d3436",
    gradientTo: "#636e72",
    subtopics: [
      {
        id: "s8",
        title: "Democratic Legitimacy",
        arguments: [
          { id: "c1", content: "Australia's mandatory voting produces 95%+ turnout, giving elected officials a genuine mandate from the entire population.", argumentType: "opening", sideLabel: "For", sideOrder: 0, parentArgumentId: null, isEdited: false },
          { id: "c2", content: "Forced participation doesn't equal informed participation. Australia also has high rates of 'donkey votes' — random or blank ballots.", argumentType: "counter", sideLabel: "Against", sideOrder: 1, parentArgumentId: "c1", isEdited: false },
        ],
      },
      {
        id: "s9",
        title: "Individual Freedom",
        arguments: [
          { id: "c3", content: "The right to vote inherently includes the right not to vote. Compulsion is antithetical to the freedom democracy is supposed to protect.", argumentType: "opening", sideLabel: "Against", sideOrder: 1, parentArgumentId: null, isEdited: false },
          { id: "c4", content: "We mandate jury duty, taxes, and education. Voting is a civic duty of equal importance.", argumentType: "counter", sideLabel: "For", sideOrder: 0, parentArgumentId: "c3", isEdited: false },
        ],
      },
    ],
  },
  "trending-2": {
    id: "trending-2",
    topic: "Nuclear energy: solution or risk?",
    description: "Weighing nuclear power's potential as a carbon-free energy source against safety concerns and waste management challenges.",
    date: "3 days ago",
    participants: 8,
    totalArguments: 55,
    status: "completed",
    gradientFrom: "#0c3547",
    gradientTo: "#1a5276",
    subtopics: [
      { id: "s10", title: "Safety Record", arguments: [
        { id: "d1", content: "Modern Gen IV reactors have passive safety systems that make meltdowns physically impossible.", argumentType: "opening", sideLabel: "Pro-Nuclear", sideOrder: 0, parentArgumentId: null, isEdited: false },
        { id: "d2", content: "Chernobyl and Fukushima were also considered safe. Human error and natural disasters can't be engineered away entirely.", argumentType: "counter", sideLabel: "Anti-Nuclear", sideOrder: 1, parentArgumentId: "d1", isEdited: false },
      ]},
      { id: "s11", title: "Waste Management", arguments: [
        { id: "d3", content: "All nuclear waste ever produced in the US would fit on a single football field stacked 10 yards high. The volume problem is vastly overstated.", argumentType: "opening", sideLabel: "Pro-Nuclear", sideOrder: 0, parentArgumentId: null, isEdited: false },
      ]},
    ],
  },
  "trending-3": {
    id: "trending-3",
    topic: "Does social media do more harm than good for democracy?",
    description: "Examining whether platforms like X, TikTok, and Instagram strengthen civic engagement or erode democratic norms through misinformation and polarization.",
    date: "1 week ago",
    participants: 5,
    totalArguments: 31,
    status: "completed",
    gradientFrom: "#2c3e50",
    gradientTo: "#3498db",
    subtopics: [
      { id: "s12", title: "Information Access", arguments: [
        { id: "e1", content: "Social media gives marginalized voices a platform they never had in traditional media gatekept by editors and producers.", argumentType: "opening", sideLabel: "More Good", sideOrder: 0, parentArgumentId: null, isEdited: false },
        { id: "e2", content: "Algorithmic amplification means the loudest and most extreme voices dominate, not the most marginalized.", argumentType: "counter", sideLabel: "More Harm", sideOrder: 1, parentArgumentId: "e1", isEdited: false },
      ]},
    ],
  },
  "latest-1": {
    id: "latest-1",
    topic: "Park funding allocation for 2026",
    description: "Local stakeholders debate how to distribute the $12M parks budget across maintenance, new facilities, and community programs.",
    date: "2 days ago",
    participants: 5,
    totalArguments: 19,
    community: "Portland, OR",
    verified: true,
    status: "completed",
    gradientFrom: "#1b4332",
    gradientTo: "#2d6a4f",
    subtopics: [
      { id: "s13", title: "Maintenance vs. New Builds", arguments: [
        { id: "f1", content: "60% of existing park infrastructure is rated 'fair' or 'poor'. We should fix what we have before building new.", argumentType: "opening", sideLabel: "Maintenance First", sideOrder: 0, parentArgumentId: null, isEdited: false },
      ]},
    ],
  },
  "latest-2": {
    id: "latest-2",
    topic: "Should school start times be pushed to 9am?",
    description: "Parents, teachers, and sleep researchers discuss whether later school start times improve student outcomes.",
    date: "3 days ago",
    participants: 3,
    totalArguments: 18,
    status: "completed",
    gradientFrom: "#4a1942",
    gradientTo: "#6c3483",
    subtopics: [
      { id: "s14", title: "Student Health", arguments: [
        { id: "g1", content: "The American Academy of Pediatrics recommends start times no earlier than 8:30am. Adolescents need 8-10 hours of sleep.", argumentType: "opening", sideLabel: "For 9am", sideOrder: 0, parentArgumentId: null, isEdited: false },
      ]},
    ],
  },
  "latest-3": {
    id: "latest-3",
    topic: "Remote work mandates: fair or outdated?",
    description: "Employees and managers debate return-to-office policies and whether productivity requires physical presence.",
    date: "4 days ago",
    participants: 7,
    totalArguments: 29,
    status: "completed",
    gradientFrom: "#1a1a2e",
    gradientTo: "#e94560",
    subtopics: [
      { id: "s15", title: "Productivity Metrics", arguments: [
        { id: "h1", content: "Stanford research shows remote workers are 13% more productive than in-office counterparts, with lower attrition rates.", argumentType: "opening", sideLabel: "Pro-Remote", sideOrder: 0, parentArgumentId: null, isEdited: false },
        { id: "h2", content: "Those studies measure individual output, not collaborative innovation. Breakthrough ideas happen in hallways, not Zoom calls.", argumentType: "counter", sideLabel: "Pro-Office", sideOrder: 1, parentArgumentId: "h1", isEdited: false },
      ]},
    ],
  },
};

/* ── Component ── */

const ExploreDebateDetailPage = () => {
  const { debateId } = useParams<{ debateId: string }>();
  const navigate = useNavigate();
  const [expandedSubtopic, setExpandedSubtopic] = useState<string | null>(null);

  const debate = debateId ? MOCK_DEBATES[debateId] : undefined;

  if (!debate) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground font-body">Debate not found.</p>
          <button onClick={() => navigate("/explore")} className="mt-4 text-sm font-body underline text-foreground">
            ← Back to Explore
          </button>
        </div>
      </AppLayout>
    );
  }

  const toggleSubtopic = (id: string) => {
    setExpandedSubtopic((prev) => (prev === id ? null : id));
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Back */}
          <button
            onClick={() => navigate("/explore")}
            className="flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Explore
          </button>

          {/* Hero */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 mb-12">
            {/* Album art */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="w-full md:w-[280px] aspect-square rounded-2xl shrink-0 shadow-lg overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${debate.gradientFrom}, ${debate.gradientTo})`,
              }}
            >
              <div className="w-full h-full flex items-end p-6">
                <span className="text-white/30 text-[10px] font-body font-medium uppercase tracking-[0.2em]">
                  d. debate
                </span>
              </div>
            </motion.div>

            {/* Metadata */}
            <div className="flex flex-col justify-end min-w-0">
              {debate.community && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-body font-medium uppercase tracking-wider text-muted-foreground">
                    {debate.community}
                  </span>
                  {debate.verified && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-body font-medium">
                      <Shield className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
              )}

              <h1 className="font-display text-2xl md:text-3xl lg:text-4xl leading-tight mb-3">
                {debate.topic}
              </h1>

              <div className="flex items-center gap-3 mb-4 flex-wrap">
                {debate.status === "live" && (
                  <span className="flex items-center gap-1.5 text-[10px] font-body font-medium uppercase tracking-wider bg-[#dcfce7] text-[#166534] dark:bg-[#166534]/20 dark:text-[#4ade80] px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-[#166534] dark:bg-[#4ade80] rounded-full animate-pulse" />
                    Live
                  </span>
                )}
                {debate.status === "completed" && (
                  <span className="text-[10px] font-body font-medium uppercase tracking-wider bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full">
                    Completed
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground font-body flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {debate.date}
                </span>
              </div>

              <p className="text-sm font-body text-muted-foreground leading-relaxed mb-4 max-w-lg">
                {debate.description}
              </p>

              <div className="flex items-center gap-4 text-[12px] text-muted-foreground font-body">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> {debate.participants} participants
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> {debate.totalArguments} arguments
                </span>
                <span className="flex items-center gap-1.5">
                  {debate.subtopics.length} subtopics
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border mb-6" />

          {/* Subtopics tracklist */}
          <div>
            {debate.subtopics.map((subtopic, index) => {
              const isExpanded = expandedSubtopic === subtopic.id;
              const argCount = countAllArguments(subtopic.arguments);
              return (
                <motion.div
                  key={subtopic.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  {/* Row */}
                  <button
                    onClick={() => toggleSubtopic(subtopic.id)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-accent/60 transition-colors rounded-lg group text-left"
                  >
                    <span className="text-[13px] font-body text-muted-foreground w-6 text-right tabular-nums shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-body font-medium text-foreground truncate block">
                        {subtopic.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-body text-muted-foreground shrink-0">
                      {argCount} {argCount === 1 ? "argument" : "arguments"}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Expanded arguments */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-10 pr-4 pb-4 pt-1">
                          <ArgumentThread arguments={subtopic.arguments} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Row divider */}
                  {index < debate.subtopics.length - 1 && !isExpanded && (
                    <div className="border-b border-border/50 mx-4" />
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8">
            <RecordCommentsSection
              recordType={(debate as any).format === "change_my_mind" ? "change_my_mind" : "debate"}
              recordId={debate.id}
            />
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

/* ── Argument thread renderer (mirrors LiveArgumentMap) ── */

function countAllArguments(args: MockArgument[]): number {
  return args.length;
}

const ArgumentThread = ({ arguments: args }: { arguments: MockArgument[] }) => {
  const rootArgs = args.filter((a) => !a.parentArgumentId);
  const childrenMap = new Map<string, MockArgument[]>();
  args.forEach((a) => {
    if (a.parentArgumentId) {
      const existing = childrenMap.get(a.parentArgumentId) || [];
      existing.push(a);
      childrenMap.set(a.parentArgumentId, existing);
    }
  });

  const sideColor = (order: number) =>
    order === 0
      ? "border-l-[hsl(var(--side-1))] bg-[hsl(var(--side-1)/0.05)]"
      : "border-l-[hsl(var(--side-2))] bg-[hsl(var(--side-2)/0.05)]";

  const sideDot = (order: number) =>
    order === 0 ? "bg-[hsl(var(--side-1))]" : "bg-[hsl(var(--side-2))]";

  const renderNode = (node: MockArgument, depth: number) => {
    const children = childrenMap.get(node.id) || [];
    return (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className={depth > 0 ? "ml-4 mt-2" : "mt-2"}
      >
        <div className={`rounded-lg border-l-[3px] px-3 py-2.5 text-[13px] ${sideColor(node.sideOrder)}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${sideDot(node.sideOrder)}`} />
            <span className="font-semibold text-foreground font-display text-xs">
              {node.sideLabel}
            </span>
            {node.argumentType === "counter" && (
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground uppercase tracking-wider">
                <ArrowRight className="w-2.5 h-2.5" /> counter
              </span>
            )}
            {node.argumentType === "quote" && (
              <Quote className="w-3 h-3 text-muted-foreground" />
            )}
            {node.isEdited && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
                Edited
              </span>
            )}
          </div>
          <p className="text-foreground leading-relaxed font-body">{node.content}</p>
        </div>
        {children.length > 0 && (
          <div className="border-l border-border ml-3">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-0">
      {rootArgs.map((node) => renderNode(node, 0))}
    </div>
  );
};

export default ExploreDebateDetailPage;
