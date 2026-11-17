import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Brand } from "@/components/Brand";
import { useAuth } from "@/lib/auth";
import { SignInScreen } from "@/screens/SignIn";
import { SignUpScreen } from "@/screens/SignUp";
import { PendingScreen } from "@/screens/Pending";
import { HomeScreen } from "@/screens/Home";
import { HistoryScreen } from "@/screens/History";
import { ScheduleScreen } from "@/screens/Schedule";
import { RequestsScreen } from "@/screens/Requests";
import { MealsScreen } from "@/screens/Meals";
import { TrainingScreen } from "@/screens/Training";
import { NotificationsScreen } from "@/screens/Notifications";
import { ProfileScreen } from "@/screens/Profile";

// Admin screens are split into separate chunks so the employee app stays
// lightweight on startup.
const AdminDashboardScreen = lazy(() =>
  import("@/screens/AdminDashboard").then((module) => ({
    default: module.AdminDashboardScreen,
  })),
);
const AdminRequestsScreen = lazy(() =>
  import("@/screens/AdminRequests").then((module) => ({
    default: module.AdminRequestsScreen,
  })),
);
const AdminReportsScreen = lazy(() =>
  import("@/screens/AdminReports").then((module) => ({
    default: module.AdminReportsScreen,
  })),
);
const AdminEmployeesScreen = lazy(() =>
  import("@/screens/AdminEmployees").then((module) => ({
    default: module.AdminEmployeesScreen,
  })),
);
const AdminMealsScreen = lazy(() =>
  import("@/screens/AdminMeals").then((module) => ({
    default: module.AdminMealsScreen,
  })),
);
const AdminScheduleScreen = lazy(() =>
  import("@/screens/AdminSchedule").then((module) => ({
    default: module.AdminScheduleScreen,
  })),
);
const AdminTrainingScreen = lazy(() =>
  import("@/screens/AdminTraining").then((module) => ({
    default: module.AdminTrainingScreen,
  })),
);
const AdminDepartmentsScreen = lazy(() =>
  import("@/screens/AdminDepartments").then((module) => ({
    default: module.AdminDepartmentsScreen,
  })),
);
const AdminPositionsScreen = lazy(() =>
  import("@/screens/AdminPositions").then((module) => ({
    default: module.AdminPositionsScreen,
  })),
);
const AdminLocationsScreen = lazy(() =>
  import("@/screens/AdminLocations").then((module) => ({
    default: module.AdminLocationsScreen,
  })),
);
const AdminSettingsScreen = lazy(() =>
  import("@/screens/AdminSettings").then((module) => ({
    default: module.AdminSettingsScreen,
  })),
);
const AdminPayrollScreen = lazy(() =>
  import("@/screens/AdminPayroll").then((module) => ({
    default: module.AdminPayrollScreen,
  })),
);

function Splash() {
  return (
    <div className="flex min-h-app flex-col items-center justify-center gap-4 px-6">
      <Brand href="/" />
      <LoaderCircle
        className="size-5 animate-spin text-muted-foreground"
        aria-label="Memuat aplikasi"
      />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === "loading") return <Splash />;
  if (status === "unauthenticated") return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
}

function RequireManager({ children }: { children: React.ReactNode }) {
  const { roles } = useAuth();
  if (!roles.some((role) => ["hod", "hrd", "admin"].includes(role))) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { roles } = useAuth();
  if (!roles.some((role) => ["hrd", "admin"].includes(role))) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

function RootRedirect() {
  const { status, homePath } = useAuth();
  if (status === "loading") return <Splash />;
  return <Navigate to={status === "authenticated" ? homePath : "/sign-in"} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<Splash />}>
      <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/sign-in" element={<SignInScreen />} />
      <Route path="/sign-up" element={<SignUpScreen />} />
      <Route path="/pending" element={<PendingScreen />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/app" element={<HomeScreen />} />
        <Route path="/app/history" element={<HistoryScreen />} />
        <Route path="/app/schedule" element={<ScheduleScreen />} />
        <Route path="/app/requests" element={<RequestsScreen />} />
        <Route path="/app/meals" element={<MealsScreen />} />
        <Route path="/app/training" element={<TrainingScreen />} />
        <Route path="/app/notifications" element={<NotificationsScreen />} />
        <Route path="/app/profile" element={<ProfileScreen />} />

        <Route
          path="/admin"
          element={
            <RequireManager>
              <AdminDashboardScreen />
            </RequireManager>
          }
        />
        <Route
          path="/admin/schedule"
          element={
            <RequireManager>
              <AdminScheduleScreen />
            </RequireManager>
          }
        />
        <Route
          path="/admin/meals"
          element={
            <RequireManager>
              <AdminMealsScreen />
            </RequireManager>
          }
        />
        <Route
          path="/admin/training"
          element={
            <RequireManager>
              <AdminTrainingScreen />
            </RequireManager>
          }
        />
        <Route
          path="/admin/requests"
          element={
            <RequireManager>
              <AdminRequestsScreen />
            </RequireManager>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <RequireManager>
              <NotificationsScreen />
            </RequireManager>
          }
        />
        <Route
          path="/admin/employees"
          element={
            <RequireManager>
              <AdminEmployeesScreen />
            </RequireManager>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <RequireManager>
              <AdminReportsScreen />
            </RequireManager>
          }
        />
        <Route
          path="/admin/payroll"
          element={
            <RequireAdmin>
              <AdminPayrollScreen />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <RequireAdmin>
              <AdminDepartmentsScreen />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/positions"
          element={
            <RequireAdmin>
              <AdminPositionsScreen />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/locations"
          element={
            <RequireAdmin>
              <AdminLocationsScreen />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RequireAdmin>
              <AdminSettingsScreen />
            </RequireAdmin>
          }
        />
      </Route>

      <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
}
