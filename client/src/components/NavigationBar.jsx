import { useNavigate } from "react-router-dom";
import { getSessionRoleState } from "../auth";

export default function NavigationBar() {
  const navigate = useNavigate();
  const { isStaff, isAdmin } = getSessionRoleState();

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
