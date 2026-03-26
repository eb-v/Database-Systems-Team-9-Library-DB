import NavigationBar from "../components/NavigationBar";
import { useNavigate } from "react-router-dom";
import holdsIcon from "../assets/hold.png";
import borrowIcon from "../assets/borrow.png";
import feesIcon from "../assets/fee.png";
import profileIcon from "../assets/user.png";

export default function ViewAccountPage() {
  const navigate = useNavigate();

  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";
  
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
      description: "View and pay any outstanding fees on your account.",
      icon: feesIcon,
      path: "/fees"
    },
    {
      title: "Personal Information",
      description: "View and update your personal account information.",
      icon: profileIcon,
      path: "/my-profile"
    },
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}