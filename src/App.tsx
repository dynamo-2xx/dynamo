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
import CreateDebatePage from "./pages/CreateDebatePage";
import MyDebatesPage from "./pages/MyDebatesPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DebateRoomPage from "./pages/DebateRoomPage";
import JoinDebatePage from "./pages/JoinDebatePage";
import NotificationsPage from "./pages/NotificationsPage";
import DebatePreviewPage from "./pages/DebatePreviewPage";
import NotFound from "./pages/NotFound";
import ProjectorPage from "./pages/ProjectorPage";
import AudiencePage from "./pages/AudiencePage";
import LiveSessionPage from "./pages/LiveSessionPage";
import SharedLiveSessionPage from "./pages/SharedLiveSessionPage";

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
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><CreateDebatePage /></ProtectedRoute>} />
              <Route path="/debate/:id" element={<ProtectedRoute><DebateRoomPage /></ProtectedRoute>} />
              <Route path="/debate/:id/projector" element={<ProjectorPage />} />
              <Route path="/debate/:id/audience" element={<AudiencePage />} />
              <Route path="/join/:code" element={<JoinDebatePage />} />
              <Route path="/preview/:token" element={<DebatePreviewPage />} />
              <Route path="/live/new" element={<ProtectedRoute><LiveSessionPage /></ProtectedRoute>} />
              <Route path="/live/:id" element={<ProtectedRoute><LiveSessionPage /></ProtectedRoute>} />
              <Route path="/live/shared/:token" element={<SharedLiveSessionPage />} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/my-debates" element={<ProtectedRoute><MyDebatesPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
