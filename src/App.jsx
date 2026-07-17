import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import LandingPage from './pages/public/LandingPage.jsx';
import Gallery from './pages/public/Gallery.jsx';
import OrderConfirmation from './pages/public/OrderConfirmation.jsx';
import OrderEdit from './pages/public/OrderEdit.jsx';
import Login from './pages/admin/Login.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Inventory from './pages/admin/Inventory.jsx';
import Orders from './pages/admin/Orders.jsx';
import OrderDetail from './pages/admin/OrderDetail.jsx';
import OpeningSchedule from './pages/admin/OpeningSchedule.jsx';
import Calendar from './pages/admin/Calendar.jsx';
import OrderConflicts from './pages/admin/OrderConflicts.jsx';
import Reports from './pages/admin/Reports.jsx';
import GalleryManager from './pages/admin/GalleryManager.jsx';
import ImportantInfoManager from './pages/admin/ImportantInfoManager.jsx';

const RootLayout = () => (
  <>
    <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
    <Outlet />
  </>
);

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <PublicLayout />,
        children: [
          { index: true, element: <LandingPage /> },
          { path: 'gallery', element: <Gallery /> },
          { path: 'order-confirmation/:orderId', element: <OrderConfirmation /> },
          { path: 'order-edit/:orderId', element: <OrderEdit /> },
        ],
      },
      { path: '/admin/login', element: <Login /> },
      {
        path: '/admin',
        element: (
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'inventory', element: <Inventory /> },
          { path: 'orders', element: <Orders /> },
          { path: 'orders/:orderId', element: <OrderDetail /> },
          { path: 'opening-schedule', element: <OpeningSchedule /> },
          { path: 'calendar', element: <Calendar /> },
          { path: 'order-conflicts', element: <OrderConflicts /> },
          { path: 'reports', element: <Reports /> },
          { path: 'gallery', element: <GalleryManager /> },
          { path: 'important-info', element: <ImportantInfoManager /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
