import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import OfflineBanner from "@/components/OfflineBanner";
import IncidentBanner from "@/components/IncidentBanner";
import PastDueBanner from "@/components/PastDueBanner";
import InstallAppChip from "@/components/InstallAppChip";
import { LiveRegionProvider } from "@/components/a11y/LiveRegion";
import Index from "./pages/Index";
import ExplorePage from "./pages/ExplorePage";
import ExploreDebateDetailPage from "./pages/ExploreDebateDetailPage";
import CreateDebatePage from "./pages/CreateDebatePage";
import MyDebatesPage from "./pages/MyDebatesPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DebateRoomPage from "./pages/DebateRoomPage";
import DebateEditArgumentsPage from "./pages/DebateEditArgumentsPage";
import DebateGradeReportPage from "./pages/DebateGradeReportPage";
import JoinDebatePage from "./pages/JoinDebatePage";
import NotificationsPage from "./pages/NotificationsPage";
import DebatePreviewPage from "./pages/DebatePreviewPage";
import DebateScheduledPreviewPage from "./pages/DebateScheduledPreviewPage";
import NotFound from "./pages/NotFound";
import ProjectorPage from "./pages/ProjectorPage";
import AudiencePage from "./pages/AudiencePage";
import LiveSessionPage from "./pages/LiveSessionPage";
import SharedLiveSessionPage from "./pages/SharedLiveSessionPage";
import LiveJoinPage from "./pages/LiveJoinPage";
import ForYouPage from "./pages/ForYouPage";
import MyRecentPage from "./pages/MyRecentPage";
import EditProfilePage from "./pages/EditProfilePage";
import TopicPage from "./pages/TopicPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import AdminTagsPage from "./pages/AdminTagsPage";
import AdminCostsPage from "./pages/AdminCostsPage";
import AdminDeletionReviewPage from "./pages/AdminDeletionReviewPage";
import AdminModerationPage from "./pages/AdminModerationPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import StatusPage from "./pages/StatusPage";
import GuidelinesPage from "./pages/GuidelinesPage";
import SubprocessorsPage from "./pages/SubprocessorsPage";
import MessagesPage from "./pages/MessagesPage";
import MyStudyPage from "./pages/MyStudyPage";
import MyStudyDetailPage from "./pages/MyStudyDetailPage";
import SharedNotebookPage from "./pages/SharedNotebookPage";
import CreateChangeMyMindPage from "./pages/CreateChangeMyMindPage";
import ChangeMyMindRoomPage from "./pages/ChangeMyMindRoomPage";
import JoinCodeProjectorPage from "./pages/JoinCodeProjectorPage";
import DebateLobbyPage from "./pages/DebateLobbyPage";
import LiveLobbyPage from "./pages/LiveLobbyPage";
import CmmLobbyPage from "./pages/CmmLobbyPage";
import JoinCmmPage from "./pages/JoinCmmPage";
import ClubsPage from "./pages/ClubsPage";
import CreateClubPage from "./pages/CreateClubPage";
import ClubPage from "./pages/ClubPage";
import ClubEditPage from "./pages/ClubEditPage";
import CreateClubEventPage from "./pages/CreateClubEventPage";
import ClubEventDetailPage from "./pages/ClubEventDetailPage";
import ShareClaimPage from "./pages/ShareClaimPage";
import PricingPage from "./pages/PricingPage";
import ContactSalesPage from "./pages/ContactSalesPage";
import SettingsEmailPage from "./pages/SettingsEmailPage";
import SettingsBillingPage from "./pages/SettingsBillingPage";
import IntelligencePage from "./pages/IntelligencePage";
import ImportToRecordPage from "./pages/ImportToRecordPage";
import ImportedRecordPage from "./pages/ImportedRecordPage";
import { PaywallGate } from "@/components/paywall/PaywallGate";
import WaitlistPage from "./pages/WaitlistPage";
import LaunchGate from "@/components/LaunchGate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <LiveRegionProvider>
            <Toaster />
            <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
            <IncidentBanner />
            <PastDueBanner />
            <OfflineBanner />
            <InstallAppChip />
            <Routes>
              <Route path="/waitlist" element={<WaitlistPage />} />
              <Route path="/" element={<LaunchGate><Index /></LaunchGate>} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/share/:token" element={<ShareClaimPage />} />
              <Route path="/clubs" element={<ClubsPage />} />
              <Route path="/clubs/new" element={<ProtectedRoute><CreateClubPage /></ProtectedRoute>} />
              <Route path="/clubs/:id" element={<ClubPage />} />
              <Route path="/clubs/:id/edit" element={<ProtectedRoute><ClubEditPage /></ProtectedRoute>} />
              <Route path="/clubs/:id/events/new" element={<ProtectedRoute><CreateClubEventPage /></ProtectedRoute>} />
              <Route path="/clubs/:id/events/:eventId" element={<ClubEventDetailPage />} />
              <Route path="/explore/topic/:slug" element={<TopicPage />} />
              <Route path="/explore/:debateId" element={<ExploreDebateDetailPage />} />
              <Route path="/u/:userId" element={<PublicProfilePage />} />
              <Route path="/profile/connections" element={<ProtectedRoute><ConnectionsPage /></ProtectedRoute>} />
              <Route path="/admin/tags" element={<ProtectedRoute><AdminTagsPage /></ProtectedRoute>} />
              <Route path="/admin/costs" element={<ProtectedRoute><AdminCostsPage /></ProtectedRoute>} />
              <Route path="/admin/deletion-review" element={<ProtectedRoute><AdminDeletionReviewPage /></ProtectedRoute>} />
              <Route path="/admin/moderation" element={<ProtectedRoute><AdminModerationPage /></ProtectedRoute>} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><PaywallGate metric="sessions_created"><CreateDebatePage /></PaywallGate></ProtectedRoute>} />
              <Route path="/cmm/new" element={<ProtectedRoute><PaywallGate metric="sessions_created"><CreateChangeMyMindPage /></PaywallGate></ProtectedRoute>} />
              <Route path="/cmm/:id/lobby" element={<ProtectedRoute><CmmLobbyPage /></ProtectedRoute>} />
              <Route path="/cmm/join/:code" element={<JoinCmmPage />} />
              <Route path="/cmm/:id" element={<ChangeMyMindRoomPage />} />
              <Route path="/debate/:id" element={<ProtectedRoute><DebateRoomPage /></ProtectedRoute>} />
              <Route path="/debate/:id/lobby" element={<ProtectedRoute><DebateLobbyPage /></ProtectedRoute>} />
              <Route path="/debate/:id/preview" element={<ProtectedRoute><DebateScheduledPreviewPage /></ProtectedRoute>} />
              <Route path="/debate/:id/grade" element={<ProtectedRoute><DebateGradeReportPage /></ProtectedRoute>} />
              <Route path="/debate/:id/projector" element={<ProjectorPage />} />
              <Route path="/debate/:id/project-code" element={<JoinCodeProjectorPage />} />
              <Route path="/debate/:id/audience" element={<AudiencePage />} />
              <Route path="/join/:code" element={<JoinDebatePage />} />
              <Route path="/preview/:token" element={<DebatePreviewPage />} />
              <Route path="/live/new" element={<ProtectedRoute><PaywallGate metric="sessions_created"><LiveSessionPage /></PaywallGate></ProtectedRoute>} />
              <Route path="/live/:id/lobby" element={<ProtectedRoute><LiveLobbyPage /></ProtectedRoute>} />
              <Route path="/live/shared/:token" element={<SharedLiveSessionPage />} />
              <Route path="/live/join/:code" element={<LiveJoinPage />} />
              <Route path="/live/:id" element={<ProtectedRoute><LiveSessionPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/messages/:threadId" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/my-study" element={<ProtectedRoute><MyStudyPage /></ProtectedRoute>} />
              <Route path="/my-study/:notebookId" element={<ProtectedRoute><MyStudyDetailPage /></ProtectedRoute>} />
              <Route path="/study/shared/:token" element={<SharedNotebookPage />} />
              <Route path="/my-debates" element={<ProtectedRoute><MyDebatesPage /></ProtectedRoute>} />
              <Route path="/for-you" element={<ProtectedRoute><ForYouPage /></ProtectedRoute>} />
              <Route path="/my-recent" element={<ProtectedRoute><MyRecentPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/profile/edit" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
              <Route path="/debate/:id/edit" element={<ProtectedRoute><DebateEditArgumentsPage /></ProtectedRoute>} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/guidelines" element={<GuidelinesPage />} />
              <Route path="/legal/subprocessors" element={<SubprocessorsPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/contact-sales" element={<ContactSalesPage />} />
              <Route path="/settings/email" element={<ProtectedRoute><SettingsEmailPage /></ProtectedRoute>} />
              <Route path="/settings/billing" element={<ProtectedRoute><SettingsBillingPage /></ProtectedRoute>} />
              <Route path="/intelligence/:kind/:id" element={<ProtectedRoute><IntelligencePage /></ProtectedRoute>} />
              <Route path="/create/import" element={<ProtectedRoute><PaywallGate metric="sessions_created"><ImportToRecordPage /></PaywallGate></ProtectedRoute>} />
              <Route path="/import/:id" element={<ImportedRecordPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ErrorBoundary>
          </BrowserRouter>
          </LiveRegionProvider>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
