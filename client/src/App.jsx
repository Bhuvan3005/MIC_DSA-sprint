import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { GuestOnly, RequireAuth, RequireStaff } from './components/common/RouteGuards';
import StudentLayout from './components/layout/StudentLayout';
import AdminLayout from './components/layout/AdminLayout';
import { Spinner } from './components/common/ui';
import { useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import { ForgotPassword, ResetPassword } from './pages/auth/Recovery';

import Button from './components/common/Button';
const Dashboard = lazy(() => import('./pages/student/Dashboard'));
const DailyChallenges = lazy(() => import('./pages/student/DailyChallenges'));
const Leaderboard = lazy(() => import('./pages/student/Leaderboard'));
const Profile = lazy(() => import('./pages/student/Profile'));
const VideoLibrary = lazy(() => import('./pages/student/Videos').then((m) => ({ default: m.VideoLibrary })));
const VideoDetail = lazy(() => import('./pages/student/Videos').then((m) => ({ default: m.VideoDetail })));

const Overview = lazy(() => import('./pages/admin/Overview'));
const AdminChallenges = lazy(() => import('./pages/admin/Challenges'));
const AdminQuestions = lazy(() => import('./pages/admin/Questions'));
const AdminVideos = lazy(() => import('./pages/admin/Videos'));
const AdminStudents = lazy(() => import('./pages/admin/Students'));
const LeaderboardAdmin = lazy(() => import('./pages/admin/LeaderboardAdmin'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const Settings = lazy(() => import('./pages/admin/Settings'));

const Fallback = () => <div className="grid min-h-[50vh] place-items-center"><Spinner className="text-brand-400" /></div>;

function Home() {
  const { user, loading, isStaff } = useAuth();
  if (loading) return <Fallback />;
  return <Navigate to={user ? (isStaff ? '/admin' : '/dashboard') : '/login'} replace />;
}

const NotFound = () => (
  <div className="grid min-h-screen place-items-center px-4 text-center">
    <div><div className="gradient-text text-7xl font-extrabold">404</div><p className="mt-2 text-slate-400">That page doesn’t exist.</p><Button to="/" variant="primary" className="mt-5">Go home</Button></div>
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<StudentLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/daily-challenges" element={<DailyChallenges />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/videos" element={<VideoLibrary />} />
            <Route path="/videos/:slug" element={<VideoDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:id" element={<Profile />} />
          </Route>
        </Route>

        <Route element={<RequireStaff />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Overview />} />
            <Route path="challenges" element={<AdminChallenges />} />
            <Route path="questions" element={<AdminQuestions />} />
            <Route path="videos" element={<AdminVideos />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="leaderboard" element={<LeaderboardAdmin />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
