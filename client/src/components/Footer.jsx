import { useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="bg-green-900 text-white mt-30">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* About */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            ReadMore Library
          </h3>
          <p className="text-sm text-white-400">
            A modern library system designed to make borrowing books, devices, and reserving rooms simple and accessible.
          </p>

          <button
            onClick={() => navigate("/about")}
            className="mt-3 text-sm text-green-400 hover:underline"
          >
            About Us →
          </button>
        </div>

        {/* Hours */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            Hours
          </h3>
          <p className="text-sm text-white-400">Mon – Fri: 9:00 AM – 8:00 PM</p>
          <p className="text-sm text-white-400">Saturday: 10:00 AM – 6:00 PM</p>
          <p className="text-sm text-white-400">Sunday: Closed</p>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            Find Us
          </h3>
          <p className="text-sm text-white-400">
            4333 University Drive
          </p>
          <p className="text-sm text-white-400">
            Houston, TX 77204
          </p>
          <p className="text-sm text-white-400">
            (713) 743-1050
          </p>
        </div>

      </div>

      <div className="text-center text-xs text-gray-500 pb-4">
        © {new Date().getFullYear()} ReadMore Library. All rights reserved.
      </div>
    </footer>
  );
}