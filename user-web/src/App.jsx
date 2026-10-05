import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import {AuthProvider} from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import StudySetDetailPage from "./pages/StudySetDetailPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import LearnPage from "./pages/LearnPage";
import TestPage from "./pages/TestPage";
import MatchPage from "./pages/MatchPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import LearningHistoryPage from "./pages/LearningHistoryPage";
import LearningSessionDetailPage from "./pages/LearningSessionDetailPage";
import LibraryPage from "./pages/LibraryPage";
import ProfilePage from "./pages/ProfilePage";
import ClassesPage from "./pages/ClassesPage";
import ClassDetailPage from "./pages/ClassDetailPage";
import GradebookPage from "./pages/GradebookPage";
import WeakWordsPage from "./pages/WeakWordsPage";
import WeakReviewPage from "./pages/WeakReviewPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<HomePage explore />} />
            <Route path="/study-sets/:setId" element={<StudySetDetailPage />} />
            <Route
              path="/study-sets/:setId/flashcards"
              element={<FlashcardsPage />}
            />
            <Route path="/study-sets/:setId/match" element={<MatchPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/my-learning" element={<LearningHistoryPage />} />
              <Route
                path="/my-learning/:sessionId"
                element={<LearningSessionDetailPage />}
              />
              <Route path="/study-sets/:setId/learn" element={<LearnPage />} />
              <Route path="/study-sets/:setId/test" element={<TestPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/classes" element={<ClassesPage />} />
              <Route path="/classes/:classId" element={<ClassDetailPage />} />
              <Route
                path="/classes/:classId/assignments/:assignmentId/gradebook"
                element={<GradebookPage />}
              />
              <Route path="/weak-words" element={<WeakWordsPage />} />
              <Route path="/review/weak" element={<WeakReviewPage />} />
              <Route
                path="/bookmarks"
                element={<PlaceholderPage title="Đã lưu" code="API-06" />}
              />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
