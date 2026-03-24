import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import CustomerPage from "./pages/CustomerPage";
import StaffPage from "./pages/StaffPage";
import ManageItemsPage from "./pages/ManageItemsPage";
import FeesPage from "./pages/FeesPage";
import UserLookupPage from "./pages/UserLookupPage";
import ReturnsBorrowsPage from "./pages/ReturnsBorrowsPage";
import HoldsPage from "./pages/HoldsPage";
import ViewAccountPage from "./pages/ViewAccountPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/customer" element={<CustomerPage />} />
      <Route path="/staff" element={<StaffPage />} />
      <Route path="/manage-items" element={<ManageItemsPage />} />
      <Route path="/fees" element={<FeesPage />} />
      <Route path="/user-lookup" element={<UserLookupPage />} />
      <Route path="/return-borrow" element={<ReturnsBorrowsPage />} />
      <Route path="/holds" element={<HoldsPage />} />
      <Route path="/view-account" element={<ViewAccountPage />} />
    </Routes>
  );
}