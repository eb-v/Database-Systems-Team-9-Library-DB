import { useState} from "react";
import NavigationBar from "../components/NavigationBar";
import { Navigate } from "react-router-dom";

export default function ManageItemsPage() {
  const userType = sessionStorage.getItem("userType");
  const token = sessionStorage.getItem("token");

  const [action, setAction] = useState("Add");
  const [itemType, setItemType] = useState("Book");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // add form
  const [itemName, setItemName] = useState("");
  const [numCopies, setNumCopies] = useState("1");

  // book
  const [authorFirstName, setAuthorFirstName] = useState("");
  const [authorLastName, setAuthorLastName] = useState("");
  const [publisher, setPublisher] = useState("");
  const [language, setLanguage] = useState("");
  const [yearPublished, setYearPublished] = useState("");

  // cd
  const [cdType, setCdType] = useState("");
  const [rating, setRating] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  // device
  const [deviceType, setDeviceType] = useState("");

  // remove flow
  const [removeItemId, setRemoveItemId] = useState("");
  const [loadedItem, setLoadedItem] = useState(null);

  if (userType !== "staff") {
    return <Navigate to="/customer" replace />;
  }

  const resetMessages = () => {
    setMessage("");
    setMessageType("");
  };

  const resetAddForm = () => {
    setItemName("");
    setNumCopies("1");
    setAuthorFirstName("");
    setAuthorLastName("");
    setPublisher("");
    setLanguage("");
    setYearPublished("");
    setCdType("");
    setRating("");
    setReleaseDate("");
    setDeviceType("");
  };

  const handleActionChange = (e) => {
    setAction(e.target.value);
    resetMessages();
    setLoadedItem(null);
    setRemoveItemId("");
  };

  const getItemTypeNumber = () => {
    if (itemType === "Book") return 1;
    if (itemType === "CD") return 2;
    return 3;
  };

  const getCopyStatusLabel = (status) => {
    return Number(status) === 1 ? "Available" : "Removed / Unavailable";
  };

  const getItemTypeLabel = (type) => {
    if (Number(type) === 1) return "Book";
    if (Number(type) === 2) return "CD";
    if (Number(type) === 3) return "Device";
    return "Unknown";
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    resetMessages();

    console.log("TOKEN:", sessionStorage.getItem("token"));
    console.log("PAYLOAD:", payload);

    if (!itemName.trim()) {
      setMessage("Item name is required.");
      setMessageType("error");
      return;
    }

    if (!numCopies || Number(numCopies) < 1) {
      setMessage("Number of copies must be at least 1.");
      setMessageType("error");
      return;
    }

    if (itemType === "CD" && !cdType) {
      setMessage("CD type is required.");
      setMessageType("error");
      return;
    }

    if (itemType === "Device" && !deviceType) {
      setMessage("Device type is required.");
      setMessageType("error");
      return;
    }

    const payload = {
      item_name: itemName.trim(),
      item_type: getItemTypeNumber(),
      num_copies: Number(numCopies),

      // book
      author_firstName: authorFirstName.trim() || null,
      author_lastName: authorLastName.trim() || null,
      publisher: publisher.trim() || null,
      language: language.trim() || null,
      year_published: yearPublished ? Number(yearPublished) : null,
      book_damage_fine: 10,
      book_loss_fine: 15,

      // cd
      cd_type: cdType ? Number(cdType) : null,
      rating: rating ? Number(rating) : null,
      release_date: releaseDate || null,
      cd_damage_fine: 10,
      cd_loss_fine: 20,

      // device
      device_type: deviceType ? Number(deviceType) : null,
      device_damage_fine: 20,
      device_loss_fine: 50,
    };

    try {
      const response = await fetch("http://localhost:3000/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("RESPONSE STATUS:", response.status);
      console.log("RESPONSE DATA:", data);

      if (!response.ok) {
        setMessage(data.error || data.details || "Failed to add item.");
        setMessageType("error");
        return;
      }

      setMessage(`Item added successfully. New Item ID: ${data.item_id}`);
      setMessageType("success");
      resetAddForm();
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
      setMessageType("error");
    }
  };

  const handleLoadItemForRemoval = async () => {
    resetMessages();
    setLoadedItem(null);

    if (!removeItemId.trim()) {
      setMessage("Please enter an Item ID.");
      setMessageType("error");
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/items/${removeItemId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || data.details || "Failed to load item.");
        setMessageType("error");
        return;
      }

      setLoadedItem(data);
      setMessage("Item loaded.");
      setMessageType("success");
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
      setMessageType("error");
    }
  };

  const handleSoftDeleteCopy = async (itemId, copyId) => {
    resetMessages();

    try {
      const response = await fetch(
        `http://localhost:3000/api/items/${itemId}/copies/${copyId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || data.details || "Failed to remove copy.");
        setMessageType("error");
        return;
      }

      setMessage("Copy removed from circulation.");
      setMessageType("success");
      handleLoadItemForRemoval();
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
      setMessageType("error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar isStaff={true} />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-green-900 mb-2">
          Manage Library Items
        </h1>
        <p className="text-gray-600 mb-8">
          Add new items and remove copies from circulation.
        </p>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Action
              </label>
              <select
                value={action}
                onChange={handleActionChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              >
                <option>Add</option>
                <option>Remove</option>
              </select>
            </div>

            {action === "Add" && (
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
            )}
          </div>

          {action === "Add" && (
            <form onSubmit={handleAddItem} className="space-y-4">
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                Add {itemType}
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder={`Enter ${itemType.toLowerCase()} name`}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item Type
                </label>
                <input
                  type="text"
                  value={itemType}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Copies <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={numCopies}
                  onChange={(e) => setNumCopies(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                />
              </div>

              {itemType === "Book" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Author First Name
                    </label>
                    <input
                      type="text"
                      value={authorFirstName}
                      onChange={(e) => setAuthorFirstName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Author Last Name
                    </label>
                    <input
                      type="text"
                      value={authorLastName}
                      onChange={(e) => setAuthorLastName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Publisher
                    </label>
                    <input
                      type="text"
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Language
                    </label>
                    <input
                      type="text"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Year Published
                    </label>
                    <input
                      type="date"
                      value={yearPublished}
                      onChange={(e) => setYearPublished(e.target.value)}
                      placeholder="Enter year published"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    />
                  </div>
                </>
              )}

              {itemType === "CD" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      CD Type <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={cdType}
                      onChange={(e) => setCdType(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    >
                      <option value="">Select CD type</option>
                      <option value="1">DVD</option>
                      <option value="2">BluRay</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Rating
                    </label>
                    <select
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    >
                      <option value="">Select rating</option>
                      <option value="1">G</option>
                      <option value="2">PG</option>
                      <option value="3">PG-13</option>
                      <option value="4">R</option>
                      <option value="5">Explicit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Release Date
                    </label>
                    <input
                      type="date"
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    />
                  </div>
                </>
              )}

              {itemType === "Device" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Device Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  >
                    <option value="">Select device type</option>
                    <option value="1">Computer</option>
                    <option value="2">Tablet</option>
                    <option value="3">Laptop</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="bg-green-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-900"
              >
                Add {itemType}
              </button>
            </form>
          )}

          {action === "Remove" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-red-800 mb-2">
                Remove Copy from Circulation
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item ID <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={removeItemId}
                  onChange={(e) => setRemoveItemId(e.target.value)}
                  placeholder="Enter item ID"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                />
              </div>

              <button
                onClick={handleLoadItemForRemoval}
                className="bg-red-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-900"
              >
                Load Item
              </button>

              {loadedItem && (
                <div className="space-y-4">
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <p className="font-semibold text-green-900">
                      {loadedItem.Item_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Item ID: {loadedItem.Item_ID}
                    </p>
                    <p className="text-sm text-gray-600">
                      Type: {getItemTypeLabel(loadedItem.Item_type)}
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left px-4 py-2">Copy ID</th>
                          <th className="text-left px-4 py-2">Status</th>
                          <th className="text-left px-4 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadedItem.copies && loadedItem.copies.length > 0 ? (
                          loadedItem.copies.map((copy) => (
                            <tr key={copy.Copy_ID} className="border-t border-gray-200">
                              <td className="px-4 py-2">{copy.Copy_ID}</td>
                              <td className="px-4 py-2">
                                {getCopyStatusLabel(copy.Copy_status)}
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  onClick={() =>
                                    handleSoftDeleteCopy(loadedItem.Item_ID, copy.Copy_ID)
                                  }
                                  disabled={Number(copy.Copy_status) !== 1}
                                  className="bg-red-700 text-white px-4 py-2 rounded font-semibold hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Soft Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="px-4 py-4 text-center text-gray-500">
                              No copies found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {message && (
            <p
              className={`text-sm font-medium mt-6 ${
                messageType === "error" ? "text-red-700" : "text-green-700"
              }`}
            >
              {message}
            </p>
          )}

          <p className="text-sm text-gray-500 mt-8">
            <span className="text-red-600 font-semibold">*</span> indicates a required field.
          </p>
        </div>
      </div>
    </div>
  );
}