import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import roomIcon from "../assets/room.png";
import deviceIcon from "../assets/device.png";
import browseIcon from "../assets/browse.png";
import bannerImg from "../assets/lib.png";

export default function HomePage() {
  const navigate = useNavigate();

  const guestCards = [
    {
      title: "Rent a Device",
      description: "Rent laptops, tablets, and other devices.",
      path: "/rent-a-device",
      icon: deviceIcon,
    },
    {
      title: "Rent a Room",
      description: "Reserve study rooms and spaces.",
      path: "/rent-a-room",
      icon: roomIcon,
    },
    {
      title: "Browse Catalog",
      description: "Browse our books and CDs",
      path: "/catalog",
      icon: browseIcon,
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
            className="bg-green-900 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-50"
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

      <div className="flex-1">
          <section className="relative">
            <div
              className="h-[720px] bg-cover bg-center flex items-center"
              style={{ backgroundImage: `url(${bannerImg})` }}
            >
              <div className="absolute inset-0 bg-black/35"></div>

              <div className="relative max-w-6xl mx-auto px-6 w-full">
                <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight drop-shadow">
                    ReadMore
                    Library
                  </h1>

                  {/* Divider line */}
                  <div className="w-200 h-1 bg-white my-6"></div>

                  <p className="text-white/90 text-2xl md:text-3xl font-light drop-shadow">
                    Open a Book, Open Your Mind!
                  </p>
              </div>
            </div>
          </section>

          <section className="-mt-3 relative z-10 w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 shadow-lg rounded-none overflow-hidden">
              {guestCards.map((card, index) => (
                <div
                  key={card.title}
                  onClick={() => handleProtectedNavigation(card.path)}
                  className={`bg-white cursor-pointer transition hover:bg-green-50 flex flex-col items-center justify-center text-center px-6 py-8 min-h-[140px] border-t-4 border-green-700 ${
                    index !== guestCards.length - 1 ? "md:border-r border-gray-200" : ""
                  }`}
                >
                  <div className="w-16 h-16 flex items-center justify-center mb-4">
                    <img
                      src={card.icon}
                      alt={card.title}
                      className="w-14 h-14 object-contain"
                    />
                  </div>

                  <h3 className="text-xl font-semibold text-green-900 mb-2">
                    {card.title}
                  </h3>

                  <p className="text-sm text-gray-600 max-w-xs">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      <Footer />
    </div>
  );
}