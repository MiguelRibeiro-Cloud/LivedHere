import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { RequireAdmin, RequireAuth } from './components/RouteGuards';
import { AccountPage } from './pages/AccountPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminPlacesPage } from './pages/AdminPlacesPage';
import { AdminReportsPage } from './pages/AdminReportsPage';
import { AdminReviewsPage } from './pages/AdminReviewsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { BuildingPage } from './pages/BuildingPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MapPage } from './pages/MapPage';
import { StatusPage } from './pages/StatusPage';
import { SubmitPage } from './pages/SubmitPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/en" replace />} />
      <Route path="/:locale" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="home" element={<HomePage />} />
        <Route path="search" element={<MapPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="building/:id" element={<BuildingPage />} />
        <Route path="submit" element={<SubmitPage />} />
        <Route path="status" element={<StatusPage />} />
        <Route path="status/:code" element={<StatusPage />} />
        <Route path="auth/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="account" element={<AccountPage />} />
        </Route>
        <Route element={<RequireAdmin />}>
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/reviews" element={<AdminReviewsPage />} />
          <Route path="admin/reports" element={<AdminReportsPage />} />
          <Route path="admin/places" element={<AdminPlacesPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/en" replace />} />
    </Routes>
  );
}
