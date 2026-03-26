import { useNavigate } from "react-router-dom";

export default function NavigationBar() {
  const navigate = useNavigate();
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";

  const homeRoute = isAdmin ? "/admin" : isStaff ? "/staff" : "/customer";

  return (
    <nav className="bg-white shadow-md px-12 py-4 flex justify-between items-center">
      {/*library logo in the right*/}
      <div
        onClick={() => navigate(homeRoute)}
        className="text-2xl font-bold text-green-900 cursor-pointer"
      >
        Library Database
      </div>
      
        {/*log out button */}
        <button
          onClick={() => {
            sessionStorage.clear();
            navigate("/login");
          }}
          className="bg-red-800 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-900"
        >
          Log Out ➜]
        </button>
    </nav>
  );
}