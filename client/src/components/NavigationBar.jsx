import { useNavigate } from "react-router-dom";

export default function NavigationBar() {
  const navigate = useNavigate();
  const isStaff = sessionStorage.getItem("userType") === "staff";

  return (
    <nav className="bg-white shadow-md px-12 py-4 flex justify-between items-center">

      {/* LEFT: Logo */}
      <div
        onClick={() => navigate(isStaff ? "/staff" : "/customer")}
        className="text-2xl font-bold text-green-900 cursor-pointer"
      >
        Library Database
      </div>

      <div className="flex items-center gap-3">
        {/* STAFF DASHBOARD BUTTON — only for staff */}
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