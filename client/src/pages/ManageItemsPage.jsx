import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";

export default function ManageItemsPage() {
  const navigate = useNavigate();
  const [action, setAction] = useState("Add");
  const [itemType, setItemType] = useState("Book");
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";
  const [bookForm, setBookForm] = useState({
    item_name: "",
    author_firstName: "",
    author_lastName: "",
    publisher: "",
    language: "",
    year_published: "",
    book_genre: "",
    num_copies: 1,
  });

  const [cdForm, setCdForm] = useState({
    item_name: "",
    cd_type: "",
    rating: "",
    release_date: "",
    genre: "",
    num_copies: 1,
  });

  const [deviceForm, setDeviceForm] = useState({
    name: "",
    deviceType: "",
    num_copies: 1,
  });

  const [removeForm, setRemoveForm] = useState({
    itemId: "",
    copyId: "",
  });

  const [removeSearch, setRemoveSearch] = useState("");
  const [removeSearchResults, setRemoveSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCopyIds, setSelectedCopyIds] = useState([]);
  const [copies, setCopies] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const itemTypeMap = { Book: 1, CD: 2, Device: 3 };

  const resetRemoveState = () => {
    setRemoveSearch("");
    setRemoveSearchResults([]);
    setSelectedItem(null);
    setSelectedCopyIds([]);
    setCopies([]);
    setRemoveForm({ itemId: "" });
  };

  const [updateSearch, setUpdateSearch] = useState("");
  const [updateSearchResults, setUpdateSearchResults] = useState([]);
  const [updateSearchLoading, setUpdateSearchLoading] = useState(false);
  const [selectedUpdateItem, setSelectedUpdateItem] = useState(null);
  const [updateForm, setUpdateForm] = useState({});

  const resetUpdateState = () => {
    setUpdateSearch("");
    setUpdateSearchResults([]);
    setSelectedUpdateItem(null);
    setUpdateForm({});
  };

  const toDateInput = (val) => {
    if (!val) return "";
    return new Date(val).toISOString().split("T")[0];
  };

  const handleBookChange = (e) => {
    const { name, value } = e.target;
    setBookForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCdChange = (e) => {
    const { name, value } = e.target;
    setCdForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDeviceChange = (e) => {
    const { name, value } = e.target;
    setDeviceForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRemoveSearch = async () => {
    if (!removeSearch.trim()) return;
    setSearchLoading(true);
    setSelectedItem(null);
    setCopies([]);
    setSelectedCopyIds([]);
    try {
      const token = sessionStorage.getItem("token");
      const typeNum = itemTypeMap[itemType];
      const response = await apiFetch(
        `/api/items?search=${encodeURIComponent(removeSearch)}&type=${typeNum}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setRemoveSearchResults(Array.isArray(data) ? data : []);
    } catch {
      alert("Error searching items.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectItem = async (item) => {
    setSelectedItem(item);
    setSelectedCopyIds([]);
    setCopies([]);
    setRemoveForm({ itemId: item.Item_ID });
    try {
      const token = sessionStorage.getItem("token");
      const response = await apiFetch(`/api/items/${item.Item_ID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setCopies((data.copies || []).filter((c) => c.Copy_status !== 0));
    } catch {
      alert("Error fetching item copies.");
    }
  };

  const handleSelectCopy = (copyId) => {
    setSelectedCopyIds((prev) =>
      prev.includes(copyId) ? prev.filter((id) => id !== copyId) : [...prev, copyId]
    );
  };

  const handleUpdateSearch = async () => {
    if (!updateSearch.trim()) return;
    setUpdateSearchLoading(true);
    setSelectedUpdateItem(null);
    setUpdateForm({});
    try {
      const token = sessionStorage.getItem("token");
      const typeNum = itemTypeMap[itemType];
      const response = await apiFetch(
        `/api/items?search=${encodeURIComponent(updateSearch)}&type=${typeNum}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setUpdateSearchResults(Array.isArray(data) ? data : []);
    } catch {
      alert("Error searching items.");
    } finally {
      setUpdateSearchLoading(false);
    }
  };

  const handleSelectUpdateItem = async (item) => {
    setSelectedUpdateItem(item);
    setUpdateSearchResults([]);
    try {
      const token = sessionStorage.getItem("token");
      const response = await apiFetch(`/api/items/${item.Item_ID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (item.Item_type === 1) {
        setUpdateForm({
          item_name: data.Item_name || "",
          author_firstName: data.author_firstName || "",
          author_lastName: data.author_lastName || "",
          publisher: data.publisher || "",
          language: data.language != null ? String(data.language) : "",
          year_published: toDateInput(data.year_published),
          book_damage_fine: data.Book_damage_fine ?? "",
          book_loss_fine: data.Book_loss_fine ?? "",
          book_genre: data.book_genre || "",
        });
      } else if (item.Item_type === 2) {
        setUpdateForm({
          item_name: data.Item_name || "",
          cd_type: data.CD_type != null ? String(data.CD_type) : "",
          rating: data.rating != null ? String(data.rating) : "",
          release_date: toDateInput(data.release_date),
          cd_damage_fine: data.CD_damage_fine ?? "",
          cd_loss_fine: data.CD_loss_fine ?? "",
          cd_genre: data.cd_genre || "",
        });
      } else if (item.Item_type === 3) {
        setUpdateForm({
          item_name: data.Item_name || "",
          device_type: data.Device_type != null ? String(data.Device_type) : "",
          device_damage_fine: data.Device_damage_fine ?? "",
          device_loss_fine: data.Device_loss_fine ?? "",
        });
      }
    } catch {
      alert("Error fetching item details.");
    }
  };

  const handleUpdateChange = (e) => {
    const { name, value } = e.target;
    setUpdateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem("token");
      const payload = { ...updateForm };
      // convert empty strings to null for numeric/date fields so MySQL doesn't reject them
      ["book_damage_fine", "book_loss_fine", "cd_damage_fine", "cd_loss_fine",
       "device_damage_fine", "device_loss_fine", "year_published", "release_date"].forEach((f) => {
        if (payload[f] === "") payload[f] = null;
      });
      const response = await apiFetch(`/api/items/${selectedUpdateItem.Item_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.details || data.message || "Failed to update item");
      }
      alert("Item updated successfully.");
      resetUpdateState();
    } catch (error) {
      console.error("Error updating item:", error);
      alert(error.message || "Error updating item.");
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();

    try {
      const token = sessionStorage.getItem("token");
      const payload = {
        ...bookForm,
        item_type: 1,
        year_published: bookForm.year_published
          ? new Date(bookForm.year_published).toISOString().split("T")[0]
          : null,
        num_copies: Number(bookForm.num_copies),
      };
      const response = await apiFetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || data.message || "Failed to add book");
      }

      alert("Book added successfully.");

      setBookForm({
        item_name: "",
        author_firstName: "",
        author_lastName: "",
        publisher: "",
        language: "",
        year_published: "",
        book_genre: "",
        num_copies: 1,
      });
    } catch (error) {
      console.error("Error adding book:", error);
      alert(error.message || "Error adding book.");
    }
  };

  const handleAddCd = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem("token");
      const payload = {
        ...cdForm,
        item_type: 2,
        cd_type: cdForm.cd_type ? parseInt(cdForm.cd_type, 10) : null,
        rating: cdForm.rating ? parseInt(cdForm.rating, 10) : null,
        cd_genre: cdForm.genre,
        num_copies: Number(cdForm.num_copies),
      };
      const response = await apiFetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || data.message || "Failed to add CD");
      }

      alert("CD added successfully.");

      setCdForm({
        item_name: "",
        cd_type: "",
        rating: "",
        release_date: "",
        genre: "",
        num_copies: 1,
      });
    } catch (error) {
      console.error("Error adding CD:", error);
      alert(error.message || "Error adding CD.");
    }
  };

  const handleAddDevice =  async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem("token");
      const payload = {
        item_name: deviceForm.name,
        item_type: 3,
        device_type: deviceForm.deviceType ? parseInt(deviceForm.deviceType, 10) : null,
        num_copies: Number(deviceForm.num_copies),
      };
      const response = await apiFetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || data.message || "Failed to add device");
      }

      alert("Device added successfully.");

      setDeviceForm({
        name: "",
        deviceType: "",
        num_copies: 1,
      });
    } catch (error) {
      console.error("Error adding device:", error);
      alert(error.message || "Error adding device.");
    }
  };

  const handleRemoveItem = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem("token");
      for (const copyId of selectedCopyIds) {
        const response = await apiFetch(`/api/items/${removeForm.itemId}/copies/${copyId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.details || data.message || `Failed to remove copy ${copyId}`);
        }
      }

      alert(`${selectedCopyIds.length} ${selectedCopyIds.length === 1 ? "copy" : "copies"} removed successfully.`);
      resetRemoveState();
    } catch (error) {
      console.error("Error removing copy:", error);
      alert(error.message || "Error removing copy.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar isStaff={isStaff || isAdmin}/>

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
          Add, update, or remove books, CDs, and devices from the library system.
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
                onChange={(e) => { setAction(e.target.value); resetRemoveState(); resetUpdateState(); }}
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              >
                <option>Add</option>
                <option>Update</option>
                <option>Remove</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Item Type
              </label>
              <select
                value={itemType}
                onChange={(e) => { setItemType(e.target.value); resetRemoveState(); resetUpdateState(); }}
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
            <form onSubmit={handleAddBook} className="space-y-4">
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                Add Book
              </h2>

              

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Book Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="item_name"
                  placeholder="Enter book title"
                  value={bookForm.item_name}
                  onChange={handleBookChange}
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
                  value="Book"
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Author First Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="author_firstName"
                  placeholder="Enter author first name"
                  value={bookForm.author_firstName}
                  onChange={handleBookChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Author Last Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="author_lastName"
                  placeholder="Enter author last name"
                  value={bookForm.author_lastName}
                  onChange={handleBookChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Publisher <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="publisher"
                  placeholder="Enter publisher"
                  value={bookForm.publisher}
                  onChange={handleBookChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Language <span className="text-red-600">*</span>
                </label>
                <select
                  name="language"
                  value={bookForm.language}
                  onChange={handleBookChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                >
                  <option value="">Select language</option>
                  <option value="1">English</option>
                  <option value="2">Spanish</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Year Published <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  name="year_published"
                  value={bookForm.year_published}
                  onChange={handleBookChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Genre <span className="text-red-600">*</span>
                </label>
                <select
                  name="book_genre"
                  value={bookForm.book_genre}
                  onChange={handleBookChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                >
                  <option value="">Select genre</option>
                  <option value="Fiction">Fiction</option>
                  <option value="Non-Fiction">Non-Fiction</option>
                  <option value="Mystery">Mystery</option>
                  <option value="Science Fiction">Science Fiction</option>
                  <option value="Fantasy">Fantasy</option>
                  <option value="Biography">Biography</option>
                  <option value="History">History</option>
                  <option value="Romance">Romance</option>
                  <option value="Thriller">Thriller</option>
                  <option value="Children">Children</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Copies <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  name="num_copies"
                  value={bookForm.num_copies}
                  onChange={handleBookChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <button 
                type = "submit"
                className="bg-green-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-900"
              >
                Add Book
              </button>
            </form>
          )}

          {/*add cd form */}
          {action === "Add" && itemType === "CD" && (
            <form onSubmit={handleAddCd} className="space-y-4">
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                Add CD
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  CD Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="item_name"
                  placeholder="Enter CD title"
                  value={cdForm.item_name}
                  onChange={handleCdChange}
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
                  name="cd_type"
                  value={cdForm.cd_type}
                  onChange={handleCdChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                >
                  <option value="">Select CD type</option>
                  <option value="1">DVD</option>
                  <option value="2">BluRay</option>
                  <option value="3">CD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rating <span className="text-red-600">*</span>
                </label>
                <select
                  name="rating"
                  value={cdForm.rating}
                  onChange={handleCdChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required>
                  <option value="">Select rating</option>
                  <option value="1">Guided (G)</option>
                  <option value="2">PG (P)</option>
                  <option value="3">PG-13 (P13)</option>
                  <option value="4">Restricted (R)</option>
                  <option value="5">Explicit (X)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Genre <span className="text-red-600">*</span>
                </label>
                <select
                  name="genre"
                  value={cdForm.genre}
                  onChange={handleCdChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                >
                  <option value="">Select genre</option>

                  {/* Movie genres */}
                  <option value="Action">Action</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Drama">Drama</option>
                  <option value="Horror">Horror</option>
                  <option value="Sci-Fi">Sci-Fi</option>

                  {/* Music genres */}
                  <option value="Rock">Rock</option>
                  <option value="Pop">Pop</option>
                  <option value="Hip-Hop">Hip-Hop</option>
                  <option value="Jazz">Jazz</option>
                  <option value="Classical">Classical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Release Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  name="release_date"
                  value={cdForm.release_date}
                  onChange={handleCdChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Copies <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  name="num_copies"
                  value={cdForm.num_copies}
                  onChange={handleCdChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <button 
                type="submit"
                className="bg-green-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-900"
              >
                Add CD
              </button>
            </form>
          )}

          {/*add device form*/}
          {action === "Add" && itemType === "Device" && (
            <form onSubmit={handleAddDevice} className="space-y-4">
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                Add Device
              </h2>


              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Device Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name = "name"
                  placeholder="Enter device name"
                  value={deviceForm.name}
                  onChange={handleDeviceChange}
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
                  name="deviceType"
                  value={deviceForm.deviceType}
                  onChange={handleDeviceChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                >
                  <option value="">Select device type</option>
                  <option value="1">Computer</option>
                  <option value="2">Tablet</option>
                  <option value="3">Laptop</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Copies <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  name="num_copies"
                  value={deviceForm.num_copies}
                  onChange={handleDeviceChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  required
                />
              </div>

              <button
                type="submit"
                className="bg-green-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-900">
                Add Device
              </button>
            </form>
          )}

          {/*updating*/}
          {action === "Update" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                Update {itemType}
              </h2>

              {/* Search box */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search by Title <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={updateSearch}
                    onChange={(e) => setUpdateSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleUpdateSearch(); }
                    }}
                    placeholder={`Search ${itemType} title...`}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3"
                  />
                  <button
                    type="button"
                    onClick={handleUpdateSearch}
                    disabled={updateSearchLoading}
                    className="bg-green-800 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-900 disabled:opacity-50"
                  >
                    {updateSearchLoading ? "..." : "Search"}
                  </button>
                </div>
              </div>

              {/* Search results */}
              {!selectedUpdateItem && updateSearchResults.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Item
                  </label>
                  <ul className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {updateSearchResults.map((item) => (
                      <li key={item.Item_ID}>
                        <button
                          type="button"
                          onClick={() => handleSelectUpdateItem(item)}
                          className="w-full text-left px-4 py-3 hover:bg-green-50 text-sm"
                        >
                          <span className="font-medium">{item.Item_name}</span>
                          {item.author_firstName && (
                            <span className="text-gray-500 ml-2">
                              — {item.author_firstName} {item.author_lastName}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!selectedUpdateItem && updateSearch && !updateSearchLoading && updateSearchResults.length === 0 && (
                <p className="text-sm text-gray-500">No results found.</p>
              )}

              {/* Selected item chip */}
              {selectedUpdateItem && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-green-900">{selectedUpdateItem.Item_name}</span>
                    {selectedUpdateItem.author_firstName && (
                      <span className="text-gray-600 ml-2">
                        — {selectedUpdateItem.author_firstName} {selectedUpdateItem.author_lastName}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={resetUpdateState}
                    className="text-sm text-red-600 hover:underline ml-4 shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Pre-populated edit form — Book */}
              {selectedUpdateItem && selectedUpdateItem.Item_type === 1 && (
                <form onSubmit={handleUpdateItem} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Book Title <span className="text-red-600">*</span>
                    </label>
                    <input type="text" name="item_name" value={updateForm.item_name || ""} onChange={handleUpdateChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Author First Name <span className="text-red-600">*</span></label>
                    <input type="text" name="author_firstName" value={updateForm.author_firstName || ""} onChange={handleUpdateChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Author Last Name <span className="text-red-600">*</span></label>
                    <input type="text" name="author_lastName" value={updateForm.author_lastName || ""} onChange={handleUpdateChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Publisher <span className="text-red-600">*</span></label>
                    <input type="text" name="publisher" value={updateForm.publisher || ""} onChange={handleUpdateChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Language <span className="text-red-600">*</span></label>
                    <select name="language" value={updateForm.language || ""} onChange={handleUpdateChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3" required>
                      <option value="">Select language</option>
                      <option value="1">English</option>
                      <option value="2">Spanish</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Year Published <span className="text-red-600">*</span></label>
                    <input type="date" name="year_published" value={updateForm.year_published || ""} onChange={handleUpdateChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Genre <span className="text-red-600">*</span></label>
                    <select name="book_genre" value={updateForm.book_genre || ""} onChange={handleUpdateChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3" required>
                      <option value="">Select genre</option>
                      <option value="Fiction">Fiction</option>
                      <option value="Non-Fiction">Non-Fiction</option>
                      <option value="Mystery">Mystery</option>
                      <option value="Science Fiction">Science Fiction</option>
                      <option value="Fantasy">Fantasy</option>
                      <option value="Biography">Biography</option>
                      <option value="History">History</option>
                      <option value="Romance">Romance</option>
                      <option value="Thriller">Thriller</option>
                      <option value="Children">Children</option>
                    </select>
                  </div>
                  <button type="submit"
                    className="bg-green-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-900">
                    Save Changes
                  </button>
                </form>
              )}

              {/* Pre-populated edit form — CD */}
              {selectedUpdateItem && selectedUpdateItem.Item_type === 2 && (
                <form onSubmit={handleUpdateItem} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      CD Title <span className="text-red-600">*</span>
                    </label>
                    <input type="text" name="item_name" value={updateForm.item_name || ""} onChange={handleUpdateChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      CD Type <span className="text-red-600">*</span>
                    </label>
                    <select name="cd_type" value={updateForm.cd_type || ""} onChange={handleUpdateChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3" required>
                      <option value="">Select CD type</option>
                      <option value="1">DVD</option>
                      <option value="2">BluRay</option>
                      <option value="3">CD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Rating <span className="text-red-600">*</span></label>
                    <select name="rating" value={updateForm.rating || ""} onChange={handleUpdateChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3" required>
                      <option value="">Select rating</option>
                      <option value="1">Guided (G)</option>
                      <option value="2">PG (P)</option>
                      <option value="3">PG-13 (P13)</option>
                      <option value="4">Restricted (R)</option>
                      <option value="5">Explicit (X)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Genre <span className="text-red-600">*</span></label>
                    <select name="cd_genre" value={updateForm.cd_genre || ""} onChange={handleUpdateChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3" required>
                      <option value="">Select genre</option>
                      <option value="Action">Action</option>
                      <option value="Comedy">Comedy</option>
                      <option value="Drama">Drama</option>
                      <option value="Horror">Horror</option>
                      <option value="Sci-Fi">Sci-Fi</option>
                      <option value="Rock">Rock</option>
                      <option value="Pop">Pop</option>
                      <option value="Hip-Hop">Hip-Hop</option>
                      <option value="Jazz">Jazz</option>
                      <option value="Classical">Classical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Release Date <span className="text-red-600">*</span></label>
                    <input type="date" name="release_date" value={updateForm.release_date || ""} onChange={handleUpdateChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </div>
                  <button type="submit"
                    className="bg-green-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-900">
                    Save Changes
                  </button>
                </form>
              )}

              {/* Pre-populated edit form — Device */}
              {selectedUpdateItem && selectedUpdateItem.Item_type === 3 && (
                <form onSubmit={handleUpdateItem} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Device Name <span className="text-red-600">*</span>
                    </label>
                    <input type="text" name="item_name" value={updateForm.item_name || ""} onChange={handleUpdateChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Device Type <span className="text-red-600">*</span>
                    </label>
                    <select name="device_type" value={updateForm.device_type || ""} onChange={handleUpdateChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3" required>
                      <option value="">Select device type</option>
                      <option value="1">Computer</option>
                      <option value="2">Tablet</option>
                      <option value="3">Laptop</option>
                    </select>
                  </div>
                  <button type="submit"
                    className="bg-green-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-900">
                    Save Changes
                  </button>
                </form>
              )}
            </div>
          )}

          {/*removing*/}
          {action === "Remove" && (
            <form onSubmit={handleRemoveItem} className="space-y-4">
              <h2 className="text-xl font-semibold text-red-800 mb-2">
                Remove {itemType}
              </h2>

              {/* Search box */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search by Title <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={removeSearch}
                    onChange={(e) => setRemoveSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleRemoveSearch(); }
                    }}
                    placeholder={`Search ${itemType} title...`}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveSearch}
                    disabled={searchLoading}
                    className="bg-green-800 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-900 disabled:opacity-50"
                  >
                    {searchLoading ? "..." : "Search"}
                  </button>
                </div>
              </div>

              {/* Search results list */}
              {!selectedItem && removeSearchResults.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Item
                  </label>
                  <ul className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {removeSearchResults.map((item) => (
                      <li key={item.Item_ID}>
                        <button
                          type="button"
                          onClick={() => handleSelectItem(item)}
                          className="w-full text-left px-4 py-3 hover:bg-green-50 text-sm"
                        >
                          <span className="font-medium">{item.Item_name}</span>
                          {item.author_firstName && (
                            <span className="text-gray-500 ml-2">
                              — {item.author_firstName} {item.author_lastName}
                            </span>
                          )}
                          <span className="text-gray-400 ml-2">
                            ({item.total_copies} {Number(item.total_copies) === 1 ? "copy" : "copies"})
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!selectedItem && removeSearch && !searchLoading && removeSearchResults.length === 0 && (
                <p className="text-sm text-gray-500">No results found.</p>
              )}

              {/* Selected item chip */}
              {selectedItem && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-green-900">{selectedItem.Item_name}</span>
                    {selectedItem.author_firstName && (
                      <span className="text-gray-600 ml-2">
                        — {selectedItem.author_firstName} {selectedItem.author_lastName}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={resetRemoveState}
                    className="text-sm text-red-600 hover:underline ml-4 shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Copy selection */}
              {selectedItem && copies.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Copies to Remove <span className="text-red-600">*</span>
                  </label>
                  <ul className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {copies.map((copy, idx) => {
                      const statusMap = {
                        1: { label: "Available", color: "text-green-700" },
                        2: { label: "Checked Out", color: "text-yellow-700" },
                        3: { label: "Lost", color: "text-red-700" },
                        4: { label: "Damaged", color: "text-orange-700" },
                      };
                      const { label: statusLabel, color: statusColor } =
                        statusMap[copy.Copy_status] || { label: "Unknown", color: "text-gray-500" };
                      const isCheckedOut = copy.Copy_status === 2;
                      return (
                        <li key={copy.Copy_ID}>
                          <label className={`flex items-center gap-3 px-4 py-3 ${isCheckedOut ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}>
                            <input
                              type="checkbox"
                              value={copy.Copy_ID}
                              checked={selectedCopyIds.includes(copy.Copy_ID)}
                              onChange={() => handleSelectCopy(copy.Copy_ID)}
                              disabled={isCheckedOut}
                              className="accent-green-800"
                            />
                            <span className="text-sm">Copy #{idx + 1} (ID: {copy.Copy_ID})</span>
                            <span className={`text-xs font-semibold ${statusColor}`}>
                              {statusLabel}
                            </span>
                            {isCheckedOut && (
                              <span className="text-xs text-gray-400 ml-auto">Cannot remove while checked out</span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {selectedItem && copies.length === 0 && (
                <p className="text-sm text-gray-500">No active copies found for this item.</p>
              )}

              {selectedCopyIds.length > 0 && (
                <button
                  type="submit"
                  className="bg-red-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-900"
                >
                  Remove {selectedCopyIds.length === 1 ? "1 Copy" : `${selectedCopyIds.length} Copies`}
                </button>
              )}
            </form>
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