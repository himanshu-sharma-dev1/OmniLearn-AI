import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import ChatInterface from './components/ChatInterface';
import CoursePage from './components/CoursePage';
import ProfilePage from './components/ProfilePage';
import CreateCoursePage from './components/CreateCoursePage';
import StudyGuidePage from './components/StudyGuidePage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import CommandPalette from './components/CommandPalette';
import { Toaster } from './components/ui/toaster';

// A simple component to protect routes
// MOVED to the top level of the module to prevent re-renders.
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

// Main App component that includes the Router
function AppContent() {
  useDocumentTitle();
  return (
    <>
      <CommandPalette />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/chat/:courseId"
          element={
            <PrivateRoute>
              <ChatInterface />
            </PrivateRoute>
          }
        />
        <Route
          path="/courses/:courseId"
          element={
            <PrivateRoute>
              <CoursePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/courses/:courseId/study-guide"
          element={
            <PrivateRoute>
              <StudyGuidePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/create-course"
          element={
            <PrivateRoute>
              <CreateCoursePage />
            </PrivateRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to={localStorage.getItem('token') ? '/dashboard' : '/login'} />}
        />
      </Routes>
      <Toaster />
    </>
  );
}

// The main export that wraps the app in the router
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
