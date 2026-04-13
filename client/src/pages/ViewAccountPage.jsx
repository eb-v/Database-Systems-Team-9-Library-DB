import NavigationBar from "../components/NavigationBar";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import holdsIcon from "../assets/hold.png";
import borrowIcon from "../assets/borrow.png";
import feesIcon from "../assets/fee.png";
import profileIcon from "../assets/user.png";
import notifIcon from "../assets/notif.png";

export default function ViewAccountPage() {
  const navigate = useNavigate();

  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";
  const token = sessionStorage.getItem("token");
  
  const [fees, setFees] = useState([]);
  const [setMessage] = useState("");
  const [holds, setHolds] = useState([]);
  const [borrows, setBorrows] = useState([]);

  useEffect(() => {
    if (!token) {
      setMessage("No user token found. Please log in again.");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentPersonId = payload.person_id;

      fetchUserFees(currentPersonId);
    } catch (error) {
      console.error(error);
      setMessage("Unable to read user information.");
    }
  }, [token]);

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

  const unpaidFees = useMemo(
    () => fees.filter((f) => Number(f.status) === 1),
    [fees]
  );

  const unpaidTotal = useMemo(
    () => unpaidFees.reduce((sum, f) => sum + Number(f.fee_amount), 0),
    [unpaidFees]
  );

  useEffect(() => {
  if (!token) return;

  const fetchHoldsAndBorrows = async () => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentPersonId = payload.person_id;

      const [holdsResponse, borrowsResponse] = await Promise.all([
        apiFetch(`/api/holds/${currentPersonId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiFetch(`/api/borrow/${currentPersonId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const holdsData = await holdsResponse.json();
      const borrowsData = await borrowsResponse.json();

      if (holdsResponse.ok) {
        setHolds(
          Array.isArray(holdsData)
            ? holdsData.filter((h) => h.hold_status === 1 || h.hold_status === 2)
            : []
        );
      }

      if (borrowsResponse.ok) {
        setBorrows(
          Array.isArray(borrowsData)
            ? borrowsData.filter((b) => b.Copy_status === 2)
            : []
        );
      }
    } catch (error) {
      console.error("Error fetching holds and borrows:", error);
    }
  };

  fetchHoldsAndBorrows();
  }, [token]);

  const holdsCount = useMemo(() => holds.length, [holds]);
  const borrowsCount = useMemo(() => borrows.length, [borrows]);  

  const accountCards = [
    {
      title: "My Holds",
      description: "View the items you currently have on hold.",
      icon: holdsIcon,
      path: "/my-holds",
    },
    {
      title: "Active Borrows",
      description: "See the items you currently have checked out.",
      icon: borrowIcon,
      path: "/my-borrows",
    },
    {
      title: "Pay Fees",
      description: "View and pay any outstanding fees.",
      icon: feesIcon,
      path: "/fees",
      showAlert: unpaidTotal > 0,
    },
    {
      title: "Personal Information",
      description: "View and update your personal account information.",
      icon: profileIcon,
      path: "/my-profile"
    },
    {
      title: "View My Notifications",
      description: "View past and current notifications.",
      icon: notifIcon,
      path: "/notifications"
    }
    ];

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(isAdmin ? "/admin" : isStaff ? "/staff" : "/customer")}
          className="text-sm text-green-900 font-semibold hover:underline mb-6 inline-block"
        >
          ← Back
        </button>
        
        <h1 className="text-3xl font-bold text-green-900 mb-2">
          My Account
        </h1>
        <p className="text-gray-600 mb-8">
          Manage your holds, borrowed items, fees, and account information.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {accountCards.map((card) => (
            <div
              key={card.title}
              onClick={() => card.path && navigate(card.path)}
              className="relative bg-white rounded-xl shadow-md cursor-pointer transition hover:shadow-lg hover:scale-105 aspect-square p-3 flex flex-col items-center justify-center text-center overflow-hidden border border-transparent hover:border-green-800"
            >

              {/* fees due ! */}
              {card.showAlert && (
                <div className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
                  !
                </div>
              )}

              {/* hover overlay */}
              <div className="absolute inset-0 bg-black opacity-0 hover:opacity-5 transition"></div>

              {/* content */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-14 h-14 flex items-center justify-center mb-3">
                  <img
                    src={card.icon}
                    alt={card.title}
                    className="w-12 h-12 object-contain"
                  />
                </div>

                <h3 className="text-lg font-semibold text-green-900">
                  {card.title}
                </h3>

                <p className="text-sm text-gray-600 mt-0">
                  {card.description}
                </p>

                {card.title === "Pay Fees" && (
                  <p
                    className={`text-sm mt-2 font-semibold px-2 py-1 rounded-md ${
                      unpaidTotal > 0 ? "text-red-700 bg-red-100" : "text-green-700 bg-green-100"
                    }`}
                  >
                    {unpaidTotal > 0
                      ? `Balance: $${unpaidTotal.toFixed(2)}`
                      : "No balance owed"}
                  </p>
                )}

                {card.title === "My Holds" && (
                  <p className="text-sm mt-2 font-semibold px-2 py-1 rounded-md bg-green-100 text-green-700">
                    {holdsCount > 0
                      ? `${holdsCount} active hold${holdsCount > 1 ? "s" : ""}`
                      : "No active holds"}
                  </p>
                )}

                {card.title === "Active Borrows" && (
                  <p className="text-sm mt-2 font-semibold px-2 py-1 rounded-md bg-green-100 text-green-700">
                    {borrowsCount > 0
                      ? `${borrowsCount} borrowed item${borrowsCount > 1 ? "s" : ""}`
                      : "No active borrows"}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}