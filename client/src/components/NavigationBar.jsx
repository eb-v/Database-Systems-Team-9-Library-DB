import { Link, useNavigate } from "react-router-dom";

export default function NavigationBar({ isStaff = false }) {
  const navigate = useNavigate();

  return (
    <nav className="bg-white shadow-md px-12 py-4 flex justify-between items-center">
      
      {/* LEFT: Logo */}
      <div
        onClick={() => navigate(isStaff ? "/staff" : "/customer")}
        className="text-2xl font-bold text-green-900 cursor-pointer"
      >
        Library Database
      </div>

        {/* STAFF DASHBOARD BUTTON */}
        {isStaff && (
          <button
            onClick={() => navigate("/staff")}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-900"
          >
            Staff Dashboard
          </button>
        )}

        {/* LOG OUT */}
        <button
          onClick={() => {
            sessionStorage.removeItem("userType");
            sessionStorage.removeItem("staffRole");
            navigate("/login");
          }}
          className="bg-red-800 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-900"
        >
          Log Out
        </button>
    </nav>
  );
}