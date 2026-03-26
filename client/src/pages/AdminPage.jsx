import { Navigate, useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";

import userIcon from "../assets/user.png";
import feeIcon from "../assets/fee.png";
import borrowIcon from "../assets/borrow.png";
import catalogueIcon from "../assets/catalogue.png";
import holdIcon from "../assets/hold.png";
import itemIcon from "../assets/item.png";
import roomIcon from "../assets/room.png";
import deviceIcon from "../assets/device.png";
import staffIcon from "../assets/staff.png";
import reportIcon from "../assets/report.png";

const myAccountCards = [
  {
    title: "Catalog",
    description: "Browse and borrow library items.",
    icon: catalogueIcon,
    path: "/catalog",
  },
  {
    title: "Rent a Device",
    description: "Borrow laptops, tablets, and more.",
    icon: deviceIcon,
    path: "/rent-a-device",
  },
  {
    title: "Rent a Room",
    description: "Reserve a study room.",
    icon: roomIcon,
    path: "/rent-a-room",
  },
  {
    title: "My Holds",
    description: "View your active holds.",
    icon: holdIcon,
    path: "/my-holds",
  },
  {
    title: "Active Borrows",
    description: "View your checked out items.",
    icon: borrowIcon,
    path: "/my-borrows",
  },
  {
    title: "Pay Fees",
    description: "View and pay your outstanding fees.",
    icon: feeIcon,
    path: "/fees",
  },
  {
    title: "Personal Info",
    description: "View your account details.",
    icon: userIcon,
    path: "/my-profile",
  },
];

const adminToolCards = [
  {
    title: "User Lookup",
    description: "Search for a patron's profile.",
    icon: userIcon,
    path: "/user-lookup",
  },
  {
    title: "Manage Items",
    description: "Add or remove items from the system.",
    icon: itemIcon,
    path: "/manage-items",
  },
  {
    title: "Manage Staff",
    description: "Register and manage staff accounts.",
    icon: staffIcon,
    path: "/manage-staff",
  },
  {
    title: "Reports",
    description: "View system reports and analytics.",
    icon: reportIcon,
    path: "/reports",
  },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const userType = sessionStorage.getItem("userType");

  if (userType !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">

        <section>
          <h1 className="text-3xl font-bold text-green-900 mb-1">Admin Dashboard</h1>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">My Account</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {myAccountCards.map((card) => (
              <DashboardCard key={card.title} card={card} onClick={() => navigate(card.path)} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Admin Tools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {adminToolCards.map((card) => (
              <DashboardCard key={card.title} card={card} onClick={() => navigate(card.path)} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

function DashboardCard({ card, onClick }) {
  return (
    <div
      onClick={onClick}
      className="relative bg-white rounded-xl shadow-md cursor-pointer transition hover:shadow-lg hover:scale-105 aspect-square p-4 flex flex-col items-center justify-center text-center overflow-hidden border border-transparent hover:border-green-800"
    >
      <div className="absolute inset-0 bg-black opacity-0 hover:opacity-5 transition"></div>
      <div className="relative z-10 flex flex-col items-center">
        <img src={card.icon} alt={card.title} className="w-12 h-12 object-contain mb-3" />
        <h3 className="text-lg font-semibold text-green-900">{card.title}</h3>
        <p className="text-sm text-gray-600 mt-1">{card.description}</p>
      </div>
    </div>
  );
}
