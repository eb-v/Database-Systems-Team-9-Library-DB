import { useNavigate } from "react-router-dom";

export default function NavigationBar() {
  const navigate = useNavigate();
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";

  const homeRoute = isAdmin ? "/admin" : isStaff ? "/staff" : "/customer";

  return (
    <nav className="bg-white shadow-md px-12 py-4 flex justify-between items-center">

      {/* LEFT: Logo */}
      <div
        onClick={() => navigate(homeRoute)}
        className="text-2xl font-bold text-green-900 cursor-pointer"
      >
        Library Database
      </div>

      <div className="flex items-center gap-3">
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-900"
          >
            Admin Dashboard
          </button>
        )}
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
            sessionStorage.clear();
            navigate("/login");
          }}
          className="bg-red-800 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-900"
        >
          Log Out
        </button>
      </div>
    </nav>
  );
}