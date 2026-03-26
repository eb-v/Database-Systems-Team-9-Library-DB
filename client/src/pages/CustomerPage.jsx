import NavigationBar from "../components/NavigationBar";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import bannerImg from "../assets/banner.png";
import userIcon from "../assets/user.png";
import roomIcon from "../assets/room.png";
import deviceIcon from "../assets/device.png";

export default function CustomerPage() {
  const navigate = useNavigate();
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";

  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (category !== "All") params.set("type", category === "Books" ? "1" : "2");
    navigate(`/catalog?${params.toString()}`);
  };

  const customerCards = [
    {
      title: "Rent a Device",
      description: "Rent laptops, tablets, and other devices.",
      icon: deviceIcon,
      path: "/rent-a-device"
    },
    {
      title: "Rent a Room",
      description: "Reserve study rooms and spaces.",
      icon: roomIcon,
      path: "/rent-a-room"
    },
    {
      title: "View My Account",
      description: "View account information, borrowed items and holds.",
      icon: userIcon,
      path: isAdmin ? "/admin" : isStaff ? "/staff" : "/view-account"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      {/*banner*/}
      <section className="relative">
        <div
          className="h-[380px] bg-cover bg-center flex items-center justify-center"
          style={{ backgroundImage: `url(${bannerImg})` }}
        >
          {/*overlay*/}
          <div className="absolute inset-0 bg-black/40"></div>

          {/*text*/}
          <div className="relative w-full max-w-4xl px-6 text-left">

            <h1 className="text-4xl font-bold text-white mb-6 drop-shadow">
              Search this library's catalog
            </h1>

            {/*search bar*/}
            <div className="bg-white rounded-lg shadow-lg p-3 flex flex-col md:flex-row gap-3 items-center">

              {/*drop down*/}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option>All</option>
                <option>Books</option>
                <option>CDs</option>
              </select>
              
              {/*text inside search bard*/}
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

      {/*main grid*/}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {customerCards.map((card) => (
            <div
              key={card.title}
              onClick={() => navigate(card.path)}
              className="relative bg-white rounded-xl shadow-md cursor-pointer transition hover:shadow-lg hover:scale-105 aspect-square p-3  mx-auto flex flex-col items-center justify-center text-center overflow-hidden border border-transparent hover:border-green-800"
            >
              {/* dark overlay on hover */}
              <div className="absolute inset-0 bg-black opacity-0 hover:opacity-5 transition"></div>

              {/* content */}
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