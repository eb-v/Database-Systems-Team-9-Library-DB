import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import roomIcon from "../assets/room.png";
import deviceIcon from "../assets/device.png";
import browseIcon from "../assets/browse.png";

export default function HomePage() {
  const navigate = useNavigate();

  const guestCards = [
    {
      title: "Browse Catalog",
      description: "Explore books and CDs in the library.",
      path: "/catalog",
      icon: browseIcon,
    },
    {
      title: "Rent a Device",
      description: "Sign in to borrow laptops, tablets, and more.",
      path: "/rent-a-device",
      icon: deviceIcon,
    },
    {
      title: "Rent a Room",
      description: "Sign in to reserve a study room.",
      path: "/rent-a-room",
      icon: roomIcon,
    },
  ];

  const handleProtectedNavigation = (targetPath) => {
    navigate("/login", { state: { redirectTo: targetPath } });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <div className="bg-white shadow-md px-6 py-4 flex items-center justify-between">
        <div className="text-2xl font-bold text-green-900">ReadMore Library</div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/login")}
            className="border border-green-900 text-green-900 px-4 py-2 rounded-lg font-semibold hover:bg-green-50"
          >
            Log In
          </button>
          <button
            onClick={() => navigate("/register")}
            className="bg-green-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-800"
          >
            Register
          </button>
        </div>
      </div>

      <div classname = "flex-1">
        <div className="bg-green-900">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome to ReadMore Library
            </h1>
            <p className="text-white/90 text-lg max-w-2xl">
              Sign in or create an account to browse the catalog, rent devices, and reserve rooms.
            </p>
          </div>
        </div>
      </div>

      <div classname = "flex-1">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guestCards.map((card) => (
              <div
                key={card.title}
                onClick={() => handleProtectedNavigation(card.path)}
                className="relative bg-white rounded-xl shadow-md cursor-pointer transition hover:shadow-lg hover:scale-105 aspect-square p-3  mx-auto flex flex-col items-center justify-center text-center overflow-hidden border border-transparent hover:border-green-800"
              >
                <div className="absolute inset-0 bg-black opacity-0 hover:opacity-5 transition"></div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-14 h-14 flex items-center justify-center mb-3">
                    <img
                      src={card.icon}
                      alt={card.title}
                      className="w-16 h-16 object-contain"
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
      <Footer />
    </div>
  );
}