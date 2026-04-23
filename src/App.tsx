import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import ExplorePage from "./pages/ExplorePage";
import ExploreDebateDetailPage from "./pages/ExploreDebateDetailPage";
import CreateDebatePage from "./pages/CreateDebatePage";
import MyDebatesPage from "./pages/MyDebatesPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DebateRoomPage from "./pages/DebateRoomPage";
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
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import MessagesPage from "./pages/MessagesPage";
import MyStudyPage from "./pages/MyStudyPage";
import MyStudyDetailPage from "./pages/MyStudyDetailPage";
import SharedNotebookPage from "./pages/SharedNotebookPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/explore/topic/:slug" element={<TopicPage />} />
              <Route path="/explore/:debateId" element={<ExploreDebateDetailPage />} />
              <Route path="/u/:userId" element={<PublicProfilePage />} />
              <Route path="/profile/connections" element={<ProtectedRoute><ConnectionsPage /></ProtectedRoute>} />
              <Route path="/admin/tags" element={<ProtectedRoute><AdminTagsPage /></ProtectedRoute>} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><CreateDebatePage /></ProtectedRoute>} />
              <Route path="/debate/:id" element={<ProtectedRoute><DebateRoomPage /></ProtectedRoute>} />
              <Route path="/debate/:id/preview" element={<ProtectedRoute><DebateScheduledPreviewPage /></ProtectedRoute>} />
              <Route path="/debate/:id/grade" element={<ProtectedRoute><DebateGradeReportPage /></ProtectedRoute>} />
              <Route path="/debate/:id/projector" element={<ProjectorPage />} />
              <Route path="/debate/:id/audience" element={<AudiencePage />} />
              <Route path="/join/:code" element={<JoinDebatePage />} />
              <Route path="/preview/:token" element={<DebatePreviewPage />} />
              <Route path="/live/new" element={<ProtectedRoute><LiveSessionPage /></ProtectedRoute>} />
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
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
