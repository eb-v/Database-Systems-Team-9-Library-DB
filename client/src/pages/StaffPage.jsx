import { Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import NavigationBar from "../components/NavigationBar";
import { getSessionRoleState } from "../auth";
import { apiFetch } from "../api";

import userIcon from "../assets/user.png";
import feeIcon from "../assets/fee.png";
import borrowIcon from "../assets/borrow.png";
import catalogueIcon from "../assets/catalogue.png";
import holdIcon from "../assets/hold.png";
import itemIcon from "../assets/item.png";
import roomIcon from "../assets/room.png";
import manageRoomIcon from "../assets/manageroom.png";
import searchPeopleIcon from "../assets/searchpeople.png";
import deviceIcon from "../assets/device.png";

export default function StaffPage() {
  const navigate = useNavigate();
  const { isStaff, isAdmin } = getSessionRoleState();
  const token = sessionStorage.getItem("token");

  const [fees, setFees] = useState([]);
  const [, setMessage] = useState("");
  const [holds, setHolds] = useState([]);
  const [borrows, setBorrows] = useState([]);

  if (!isStaff || isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const fetchUserFees = async (currentPersonId) => {
    try {
      const response = await apiFetch(`/api/fees/${currentPersonId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Failed to load fees.");
        return;
      }
      setFees(data);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    }
  };

  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      fetchUserFees(payload.person_id);
    } catch (error) {
      console.error(error);
      setMessage("Unable to read user information.");
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const fetchHoldsAndBorrows = async () => {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const currentPersonId = payload.person_id;
        const [holdsResponse, borrowsResponse] = await Promise.all([
          apiFetch(`/api/holds/${currentPersonId}`, { headers: { Authorization: `Bearer ${token}` } }),
          apiFetch(`/api/borrow/${currentPersonId}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const holdsData = await holdsResponse.json();
        const borrowsData = await borrowsResponse.json();
        if (holdsResponse.ok) {
          setHolds(Array.isArray(holdsData) ? holdsData.filter((h) => h.hold_status === 1 || h.hold_status === 2) : []);
        }
        if (borrowsResponse.ok) {
          setBorrows(Array.isArray(borrowsData) ? borrowsData.filter((b) => b.Copy_status === 2) : []);
        }
      } catch (error) {
        console.error("Error fetching holds and borrows:", error);
      }
    };
    fetchHoldsAndBorrows();
  }, [token]);

  const unpaidFees = useMemo(() => fees.filter((f) => Number(f.status) === 1), [fees]);
  const unpaidTotal = useMemo(() => unpaidFees.reduce((sum, f) => sum + Number(f.fee_amount), 0), [unpaidFees]);
  const holdsCount = useMemo(() => holds.length, [holds]);
  const borrowsCount = useMemo(() => borrows.length, [borrows]);

  const myAccountCards = [
    { title: "Catalog", description: "Browse and borrow library items.", icon: catalogueIcon, path: "/customer" },
    { title: "Rent a Device", description: "Borrow laptops, tablets, and more.", icon: deviceIcon, path: "/rent-a-device" },
    { title: "Rent a Room", description: "Reserve a study room.", icon: roomIcon, path: "/rent-a-room" },
    { title: "My Holds", description: "View your active holds.", icon: holdIcon, path: "/my-holds" },
    { title: "Active Borrows", description: "View your checked out items.", icon: borrowIcon, path: "/my-borrows" },
    { title: "Pay Fees", description: "View and pay your outstanding fees.", icon: feeIcon, path: "/fees", showAlert: unpaidTotal > 0 },
    { title: "Personal Info", description: "View your account details.", icon: userIcon, path: "/my-profile" },
  ];

  const staffToolCards = [
    { title: "User Lookup", description: "Search for a patron's profile.", icon: searchPeopleIcon, path: "/user-lookup" },
    { title: "Manage Items", description: "Add or remove items from the system.", icon: itemIcon, path: "/manage-items" },
    { title: "Manage Rooms", description: "Add rooms and control availability.", icon: manageRoomIcon, path: "/manage-rooms" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">

        <section>
          <h1 className="text-3xl font-bold text-green-900 mb-1">Staff Dashboard</h1>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">My Account</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {myAccountCards.map((card) => (
              <DashboardCard
                key={card.title}
                card={card}
                onClick={() => navigate(card.path)}
                holdsCount={holdsCount}
                borrowsCount={borrowsCount}
                unpaidTotal={unpaidTotal}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Staff Tools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {staffToolCards.map((card) => (
              <DashboardCard key={card.title} card={card} onClick={() => navigate(card.path)} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

function DashboardCard({ card, onClick, holdsCount, borrowsCount, unpaidTotal }) {
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

        {card.title === "My Holds" && (
          <p className="text-sm mt-2 font-semibold px-2 py-1 rounded-md bg-green-100 text-green-700">
            {holdsCount > 0 ? `${holdsCount} active hold${holdsCount > 1 ? "s" : ""}` : "No active holds"}
          </p>
        )}

        {card.title === "Active Borrows" && (
          <p className="text-sm mt-2 font-semibold px-2 py-1 rounded-md bg-green-100 text-green-700">
            {borrowsCount > 0 ? `${borrowsCount} borrowed item${borrowsCount > 1 ? "s" : ""}` : "No active borrows"}
          </p>
        )}

        {card.title === "Pay Fees" && (
          <p className={`text-sm mt-2 font-semibold px-2 py-1 rounded-md ${unpaidTotal > 0 ? "text-red-700 bg-red-100" : "text-green-700 bg-green-100"}`}>
            {unpaidTotal > 0 ? `Balance: $${unpaidTotal.toFixed(2)}` : "No balance owed"}
          </p>
        )}
      </div>
    </div>
  );
}
