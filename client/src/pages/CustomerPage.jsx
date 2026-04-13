import NavigationBar from "../components/NavigationBar";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import bannerImg from "../assets/banner.png";
import userIcon from "../assets/user.png";
import roomIcon from "../assets/room.png";
import deviceIcon from "../assets/device.png";
import { getSessionRoleState } from "../auth";
import { apiFetch } from "../api";
import ItemImage from "../components/ItemImage";

export default function CustomerPage() {
  const navigate = useNavigate();
  const { isStaff, isAdmin } = getSessionRoleState();

  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    apiFetch("/api/items?type=1", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((books) => {
        const sortedBooks = [...(Array.isArray(books) ? books : [])]
          .sort((a, b) => b.available_copies - a.available_copies)
          .slice(0, 3);
        setFeaturedBooks(sortedBooks);
      })
      .catch(() => {})
      .finally(() => setFeaturedLoading(false));
  }, []);

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
              
              {/*text inside search card*/}
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

      {/* Featured Items */}
      <section className="max-w-6xl mx-auto px-6 py-10 pb-0">
        <h2 className="text-2xl font-bold text-green-900 mb-1">Featured Books</h2>
        <p className="text-sm text-gray-500 mb-6">Handpicked titles available in our collection.</p>

        {featuredLoading ? (
          <p className="text-sm text-gray-400 italic">Loading featured items...</p>
        ) : (
          <div className="space-y-8">

            {featuredBooks.length > 0 && (
              <div>
                <div className="grid grid-cols-3 gap-4">
                  {featuredBooks.map((item) => (
                    <FeaturedCard key={item.Item_ID} item={item} navigate={navigate} />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </section>

      {/*main grid*/}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

function FeaturedCard({ item, navigate }) {
  const available = Number(item.available_copies);
  const total = Number(item.total_copies);

  return (
    <div
      onClick={() => navigate(`/catalog/${item.Item_ID}`)}
      className="cursor-pointer group flex-1 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-green-300 transition overflow-hidden flex flex-col"
    >
      {/* Green accent bar */}
      <div className="h-1.5 bg-green-700 w-full" />

      <div className="p-4 flex gap-3 flex-1">
        <ItemImage
          itemId={item.Item_ID}
          itemName={item.Item_name}
          className="h-28 w-20 shrink-0"
          imageClassName="h-full w-full object-cover"
        />
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div>
            <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-green-800 transition">
              {item.Item_name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {item.author_firstName} {item.author_lastName}
            </p>
          </div>

          {item.book_genre && (
            <span className="self-start bg-green-50 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-green-200">
              {item.book_genre}
            </span>
          )}

          <div className="mt-auto flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${available > 0 ? "bg-green-500" : "bg-gray-300"}`} />
            <span className="text-xs text-gray-500">{available} of {total} available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
