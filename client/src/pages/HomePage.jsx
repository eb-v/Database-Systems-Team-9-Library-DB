import { useState } from "react";
import { useNavigate } from "react-router-dom";
import bannerImg from "../assets/banner.png";
import roomIcon from "../assets/room.png";
import deviceIcon from "../assets/device.png";
import itemIcon from "../assets/item.png";

export default function HomePage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (category !== "All") params.set("type", category === "Books" ? "1" : "2");
    navigate(`/catalog?${params.toString()}`);
  };

  const guestCards = [
    {
      title: "Browse Catalog",
      description: "View books and CDs available in the library.",
      icon: itemIcon,
      path: "/catalog",
    },
    {
      title: "View Devices",
      description: "Browse laptops, tablets, and other devices.",
      icon: deviceIcon,
      path: "/rent-a-device",
    },
    {
      title: "View Rooms",
      description: "Browse available rooms and reservation times.",
      icon: roomIcon,
      path: "/rent-a-room",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md px-12 py-4 flex justify-between items-center">
        <div
          onClick={() => navigate("/")}
          className="text-2xl font-bold text-green-900 cursor-pointer"
        >
          ReadMore Library
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/login")}
            className="border border-green-900 text-green-900 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-50"
          >
            Log In
          </button>
          <button
            onClick={() => navigate("/register")}
            className="bg-green-900 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-800"
          >
            Register
          </button>
        </div>
      </nav>

      <section className="relative">
        <div
          className="h-[380px] bg-cover bg-center flex items-center justify-center"
          style={{ backgroundImage: `url(${bannerImg})` }}
        >
          <div className="absolute inset-0 bg-black/40"></div>

          <div className="relative w-full max-w-4xl px-6 text-left">
            <h1 className="text-4xl font-bold text-white mb-3 drop-shadow">
              Explore the library before logging in
            </h1>
            <p className="text-white/90 mb-6 text-lg">
              Browse books, devices, and rooms. Log in only when you're ready to borrow, place holds, or reserve.
            </p>

            <div className="bg-white rounded-lg shadow-lg p-3 flex flex-col md:flex-row gap-3 items-center">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option>All</option>
                <option>Books</option>
                <option>CDs</option>
              </select>

              <input
                type="text"
                placeholder="Search the library..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 border border-gray-300 rounded px-4 py-2"
              />

              <button
                onClick={handleSearch}
                className="bg-green-800 text-white px-5 py-2 rounded font-semibold hover:bg-green-900"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-green-900">Browse as a guest</h2>
          <p className="text-gray-600 mt-2">
            You can view what is available now. Sign in only when you want to take action.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {guestCards.map((card) => (
            <div
              key={card.title}
              onClick={() => navigate(card.path)}
              className="relative bg-white rounded-xl shadow-md cursor-pointer transition hover:shadow-lg hover:scale-105 aspect-square p-3 mx-auto flex flex-col items-center justify-center text-center overflow-hidden border border-transparent hover:border-green-800"
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
      </section>
    </div>
  );
}