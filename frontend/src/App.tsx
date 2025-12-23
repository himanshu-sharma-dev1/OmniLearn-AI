import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import ChatInterface from './components/ChatInterface';
import CoursePage from './components/CoursePage';
import ProfilePage from './components/ProfilePage';
import CreateCoursePage from './components/CreateCoursePage';
import StudyGuidePage from './components/StudyGuidePage';
import FlashcardsPage from './components/FlashcardsPage';
import MindMapPage from './components/MindMapPage';
import AnalyticsPage from './components/AnalyticsPage';
import SharedCoursePage from './components/SharedCoursePage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import AuthCallback from './components/AuthCallback';
import CommandPalette from './components/CommandPalette';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { Toaster } from './components/ui/toaster';

// A simple component to protect routes
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

// A custom hook to set the document title
function useDocumentTitle() {
  const location = useLocation();
  useEffect(() => {
    let title = "Intelli-Tutor";
    const path = location.pathname;

    if (path === "/login") title = "Intelli-Tutor - Login";
    else if (path === "/dashboard") title = "Intelli-Tutor - Dashboard";
    else if (path === "/profile") title = "Intelli-Tutor - Profile";
    else if (path === "/create-course") title = "Intelli-Tutor - Create Course";
    else if (path.startsWith("/chat/")) title = "Intelli-Tutor - Chat";
    else if (path.startsWith("/courses/") && path.endsWith("/study-guide")) title = "Intelli-Tutor - Study Guide";
    else if (path.startsWith("/courses/")) title = "Intelli-Tutor - Course";

    document.title = title;
  }, [location]);
}

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

// Animated page wrapper
const AnimatedPage = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={{ duration: 0.2, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

// Main App component that includes the Router
function AppContent() {
  useDocumentTitle();
  const location = useLocation();

  return (
    <>
      <CommandPalette />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={
            <AnimatedPage><LoginPage /></AnimatedPage>
          } />
          <Route path="/forgot-password" element={
            <AnimatedPage><ForgotPasswordPage /></AnimatedPage>
          } />
          <Route path="/reset-password/:token" element={
            <AnimatedPage><ResetPasswordPage /></AnimatedPage>
          } />
          {/* OAuth callback route */}
          <Route path="/auth/callback" element={
            <AnimatedPage><AuthCallback /></AnimatedPage>
          } />
          {/* Public shared course route - no auth required */}
          <Route path="/shared/:shareToken" element={
            <AnimatedPage><SharedCoursePage /></AnimatedPage>
          } />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <AnimatedPage><DashboardPage /></AnimatedPage>
              </PrivateRoute>
            }
          />
          <Route
            path="/chat/:courseId"
            element={
              <PrivateRoute>
                <AnimatedPage><ChatInterface /></AnimatedPage>
              </PrivateRoute>
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              <PrivateRoute>
                <AnimatedPage><CoursePage /></AnimatedPage>
              </PrivateRoute>
            }
          />
          <Route
            path="/courses/:courseId/study-guide"
            element={
              <PrivateRoute>
                <AnimatedPage><StudyGuidePage /></AnimatedPage>
              </PrivateRoute>
            }
          />
          <Route
            path="/courses/:courseId/flashcards"
            element={
              <PrivateRoute>
                <AnimatedPage><FlashcardsPage /></AnimatedPage>
              </PrivateRoute>
            }
          />
          <Route
            path="/courses/:courseId/mind-map"
            element={
              <PrivateRoute>
                <AnimatedPage><MindMapPage /></AnimatedPage>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <AnimatedPage><ProfilePage /></AnimatedPage>
              </PrivateRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <AnimatedPage><AnalyticsPage /></AnimatedPage>
              </PrivateRoute>
            }
          />
          <Route
            path="/create-course"
            element={
              <PrivateRoute>
                <AnimatedPage><CreateCoursePage /></AnimatedPage>
              </PrivateRoute>
            }
          />
          <Route
            path="*"
            element={<Navigate to={localStorage.getItem('token') ? '/dashboard' : '/login'} />}
          />
        </Routes>
      </AnimatePresence>
      <Toaster />
    </>
  );
}

// The main export that wraps the app in the router
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
