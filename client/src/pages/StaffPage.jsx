import { Navigate, useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";

import userIcon from "../assets/user.png";
import feeIcon from "../assets/fee.png";
import borrowIcon from "../assets/borrow.png";
import holdIcon from "../assets/hold.png";
import reportIcon from "../assets/report.png";
import itemIcon from "../assets/item.png";
import staffIcon from "../assets/staff.png";

const staffPermissions = {
  "2": {
    title: "Manager",
    color: "bg-green-800",
    cards: [
      {
        title: "Manage Fees",
        description: "View and process a user's fee.",
        path: "/fees",
        icon: feeIcon,
      },
      {
        title: "Borrow / Return Items",
        description: "Process borrows and returns.",
        path: "/return-borrow",
        icon: borrowIcon,
      },
      {
        title: "Place Hold",
        description: "Record a hold request.",
        path: "/holds",
        icon: holdIcon,
      },
      {
        title: "User Lookup",
        description: "Search for a user's profile.",
        path: "/user-lookup",
        icon: userIcon,
      },
      {
        title: "Manage Items",
        description: "Add or remove items from the system.",
        path: "/manage-items",
        icon: itemIcon,
      },
      {
        title: "Manage Staff",
        description: "Add, remove, and update staff members.",
        path: "/manage-staff",
        icon: staffIcon,
      },
      {
        title: "Generate Reports",
        description: "View system reports.",
        path: "/reports",
        icon: reportIcon,
      }    
    ],
  },
  "1": {
    title: "Staff",
    color: "bg-purple-900",
    cards: [
      {
        title: "Manage Fees",
        description: "View and process a user's fee.",
        path: "/fees",
        icon: feeIcon,
      },
      {
        title: "Borrow / Return Items",
        description: "Process borrows and returns.",
        path: "/return-borrow",
        icon: borrowIcon,
      },
      {
        title: "User Lookup",
        description: "Search for a user's profile.",
        path: "/user-lookup",
        icon: userIcon,
      },
      {
        title: "Manage Items",
        description: "Add or remove items from the system.",
        path: "/manage-items",
        icon: itemIcon,
      },
    ],
  },
};

export default function StaffPage() {
  const navigate = useNavigate();
  const role = sessionStorage.getItem("staffRole");

  if (!role || !staffPermissions[role]) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = staffPermissions[role];

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar/>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-green-900 mb-2">
          {currentRole.title} Dashboard
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentRole.cards.map((card) => (
            <div
              key={card.title}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-xl shadow-md hover:scale-105 shadow-lg border-green-800 cursor-pointer transition flex flex-col items-center justify-center text-center aspect-square p-4"
            >
              <img
                src={card.icon}
                alt={card.title}
                className="w-15 h-15 mb-8 object-contain"
              />

              <p className="text-sm text-gray-600 mb-0">
                {card.description}
              </p>

              <h3 className="text-xl font-semibold text-green-900 mb-2">
                {card.title}
              </h3>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}