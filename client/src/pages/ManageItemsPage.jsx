import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";

export default function ManageItemsPage() {
  const navigate = useNavigate();
  const [action, setAction] = useState("Add");
  const [itemType, setItemType] = useState("Book");
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar isStaff={true}/>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/*back button*/}
        <button
          onClick={() => navigate(isAdmin ? "/admin" : isStaff ? "/staff" : "/view-account")}
          className="text-sm text-green-900 font-semibold hover:underline mb-6 inline-block"
        >
          ← Back
        </button>

        {/*title*/}
        <h1 className="text-3xl font-bold text-green-900 mb-2">
          Manage Library Items
        </h1>
        {/*description*/}
        <p className="text-gray-600 mb-8">
          Add or remove books, CDs, and devices from the library system.
        </p>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div>
              {/*top dropdowns*/}
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Action
              </label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              >
                <option>Add</option>
                <option>Remove</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Item Type
              </label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              >
                <option>Book</option>
                <option>CD</option>
                <option>Device</option>
              </select>
            </div>
          </div>

          {/*add book form*/}
          {action === "Add" && itemType === "Book" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                Add Book
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item ID <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Enter item identification number"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Book Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter book title"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item Type
                </label>
                <input
                  type="text"
                  value="B (Book)"
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Author
                </label>
                <input
                  type="text"
                  placeholder="Enter author name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Publisher
                </label>
                <input
                  type="text"
                  placeholder="Enter publisher (optional)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Language
                </label>
                <input
                  type="text"
                  placeholder="Enter language (optional)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Year Published
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                />
              </div>

              <button className="bg-green-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-900">
                Add Book
              </button>
            </div>
          )}

          {/*add cd form */}
          {action === "Add" && itemType === "CD" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                Add CD
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item ID <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Enter item identification number"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  CD Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter CD title"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item Type
                </label>
                <input
                  type="text"
                  value="C (CD)"
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  CD Type <span className="text-red-600">*</span>
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                >
                  <option value="">Select CD type</option>
                  <option value="D">DVD</option>
                  <option value="B">BluRay</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rating
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-4 py-3">
                  <option value="">Select rating (optional)</option>
                  <option value="G">Guided (G)</option>
                  <option value="P">PG (P)</option>
                  <option value="P13">PG-13 (P13)</option>
                  <option value="R">Restricted (R)</option>
                  <option value="X">Explicit (X)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Release Date
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                />
              </div>

              <button className="bg-green-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-900">
                Add CD
              </button>
            </div>
          )}

          {/*add device form*/}
          {action === "Add" && itemType === "Device" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                Add Device
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item ID <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Enter item identification number"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Device Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter device name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item Type
                </label>
                <input
                  type="text"
                  value="D (Device)"
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Device Type <span className="text-red-600">*</span>
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                >
                  <option value="">Select device type</option>
                  <option value="C">Computer</option>
                  <option value="T">Tablet</option>
                  <option value="L">Laptop</option>
                </select>
              </div>

              <button className="bg-green-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-900">
                Add Device
              </button>
            </div>
          )}

          {/*removing*/}
          {action === "Remove" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-red-800 mb-2">
                Remove {itemType}
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item ID <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder={`Enter ${itemType} item ID`}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason for Removal <span className="text-red-600">*</span>
                </label>
                <textarea
                  placeholder="Enter reason for removal"
                  rows="4"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                ></textarea>
              </div>

              <button className="bg-red-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-900">
                Remove {itemType}
              </button>
            </div>
          )}

          {/*required disclaimer at bottom*/}
          <p className="text-sm text-gray-500 mt-8">
            <span className="text-red-600 font-semibold">*</span> indicates a required field.
          </p>
        </div>
      </div>
    </div>
  );
}