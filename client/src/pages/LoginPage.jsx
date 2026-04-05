import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!username.trim() || !password.trim()) {
      setMessage("Please enter your username and password.");
      return;
    }

    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();
      const role = Number(data.role);
      const staffPermissions =
        data.staff_permissions == null ? null : Number(data.staff_permissions);

      if (!response.ok) {
        setMessage(data.error || "Login failed.");
        return;
      }

      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("userRole", String(role));
      sessionStorage.setItem("personId", data.person_id);

      //role 1 = staff, role 2 = user
      if (role === 2){
        sessionStorage.setItem("userType", "customer");
        sessionStorage.removeItem("staffRole");
        navigate("/customer");
      } else if (role === 1){
        if (staffPermissions == null) {
          sessionStorage.removeItem("staffRole");
        } else {
          sessionStorage.setItem("staffRole", String(staffPermissions));
        }

        if (staffPermissions === 1) {
          sessionStorage.setItem("userType", "admin");
          navigate("/admin");
        } else {
          sessionStorage.setItem("userType", "staff");
          navigate("/staff");
        }
      } else {
        setMessage("Unable to determine account role.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-green-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-green-900">
            Library Database
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Sign in to access your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3"
            />
          </div>

          <button className="w-full bg-green-900 text-white py-3 rounded-xl font-semibold hover:bg-green-800">
            Log In
          </button>
        </form>

        {message && (
          <p className="text-center text-red-600 text-sm mt-4">
            {message}
          </p>
        )}

        <p className="text-center text-sm text-gray-600 mt-4">
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-green-900 font-semibold cursor-pointer hover:underline"
          >
            Register
          </span>
        </p>

      </div>
    </div>
  );
}
