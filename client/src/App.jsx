import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CatalogPage from "./pages/CatalogPage";
import ItemDetailPage from "./pages/ItemDetailPage";
import MyHoldsPage from "./pages/MyHoldsPage";
import MyBorrowsPage from "./pages/MyBorrowsPage";
import MyProfilePage from "./pages/MyProfilePage";
import CustomerPage from "./pages/CustomerPage";
import StaffPage from "./pages/StaffPage";
import ManageItemsPage from "./pages/ManageItemsPage";
import FeesPage from "./pages/FeesPage";
import UserLookupPage from "./pages/UserLookupPage";
import ReturnsBorrowsPage from "./pages/ReturnsBorrowsPage";
import HoldsPage from "./pages/HoldsPage";
import ViewAccountPage from "./pages/ViewAccountPage";
import RentARoomPage from "./pages/RentARoomPage";
import RentADevicePage from "./pages/RentADevicePage";
import DeviceDetailPage from "./pages/DeviceDetailPage";
import AdminPage from "./pages/AdminPage";
import ManageStaffPage from "./pages/ManageStaffPage";
import ManageRoomsPage from "./pages/ManageRoomsPage";
import ReportsPage from "./pages/ReportsPage";
import NotificationsPage from "./pages/NotificationsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/catalog" element={<CatalogPage />} />
      <Route path="/catalog/:id" element={<ItemDetailPage />} />
      <Route path="/my-holds" element={<MyHoldsPage />} />
      <Route path="/my-borrows" element={<MyBorrowsPage />} />
      <Route path="/my-profile" element={<MyProfilePage />} />
      <Route path="/customer" element={<CustomerPage />} />
      <Route path="/staff" element={<StaffPage />} />
      <Route path="/manage-items" element={<ManageItemsPage />} />
      <Route path="/fees" element={<FeesPage />} />
      <Route path="/user-lookup" element={<UserLookupPage />} />
      <Route path="/return-borrow" element={<ReturnsBorrowsPage />} />
      <Route path="/holds" element={<HoldsPage />} />
      <Route path="/view-account" element={<ViewAccountPage />} />
      <Route path="/rent-a-room" element={<RentARoomPage />} />
      <Route path="/rent-a-device" element={<RentADevicePage />} />
      <Route path="/rent-a-device/:id" element={<DeviceDetailPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/manage-staff" element={<ManageStaffPage />} />
      <Route path="/manage-rooms" element={<ManageRoomsPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
    </Routes>
  );
}