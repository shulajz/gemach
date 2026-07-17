import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        <Routes>
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="order-confirmation/:orderId" element={<OrderConfirmation />} />
            <Route path="order-edit/:orderId" element={<OrderEdit />} />
          </Route>
          <Route path="/admin/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:orderId" element={<OrderDetail />} />
            <Route path="opening-schedule" element={<OpeningSchedule />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="order-conflicts" element={<OrderConflicts />} />
            <Route path="reports" element={<Reports />} />
            <Route path="gallery" element={<GalleryManager />} />
            <Route path="important-info" element={<ImportantInfoManager />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
