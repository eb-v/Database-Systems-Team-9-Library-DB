import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = sessionStorage.getItem("token");
  const personId = sessionStorage.getItem("personId");
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await apiFetch("/api/notifications", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load notifications.");
          return;
        }

        setNotifications(data);
      } catch (err) {
        setError("Unable to load notifications.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [personId, token]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString();
  };

  const getNotificationType = (type) => {
    switch (Number(type)) {
      case 1:
        return "Hold Ready";
      case 2:
       return "Fee Update";
      case 3:
        return "Reminder";
      default:
        return "Notification";
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleToggleRead = async (notification) => {
    const { Notification_ID, is_read } = notification;
    const url = is_read
      ? `/api/notifications/${Notification_ID}/unread`
      : `/api/notifications/${Notification_ID}`;

    try {
      const response = await apiFetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data.error || "Failed to update notification.");
        return;
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.Notification_ID === Notification_ID
            ? { ...n, is_read: is_read ? 0 : 1 }
            : n
        )
      );
    } catch (err) {
      console.error("Unable to update notification.", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await apiFetch("/api/notifications/read-all", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data.error || "Failed to mark all notifications as read.");
        return;
      }

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          is_read: 1,
        }))
      );
    } catch (err) {
      console.error("Unable to mark all notifications as read.", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <NavigationBar />
        <p className="p-8 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <NavigationBar />
        <p className="p-8 text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <button
          onClick={() =>
            navigate(isAdmin ? "/admin" : isStaff ? "/staff" : "/view-account")
          }
          className="text-sm text-green-900 font-semibold hover:underline mb-6 inline-block"
        >
          ← Back
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-green-900 mb-2">
              Notifications
            </h1>
            <p className="text-gray-600">View updates related to your account.</p>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <p className="text-sm text-gray-600">
              Unread: <span className="font-semibold text-green-900">{unreadCount}</span>
            </p>
            <button
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className={`px-4 py-2 rounded-lg font-semibold ${
                unreadCount === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-900 text-white hover:bg-green-800"
              }`}
            >
              Mark All as Read
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8">
            <p className="text-gray-700">You do not have any notifications.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.Notification_ID}
                className={`rounded-2xl shadow-md p-6 border ${
                  notification.is_read
                    ? "bg-white border-gray-200"
                    : "bg-green-50 border-green-300"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h2 className="text-lg font-bold text-green-900">
                        {getNotificationType(notification.type)}
                      </h2>

                      {!notification.is_read && (
                        <span className="text-xs font-semibold bg-green-900 text-white px-2 py-1 rounded-full">
                          Unread
                        </span>
                      )}
                    </div>

                    <p className="text-gray-800 mb-3">{notification.message}</p>

                    <p className="text-sm text-gray-500">
                      {formatDateTime(notification.created_at)}
                    </p>
                  </div>

                  <div>
                    <button
                      onClick={() => handleToggleRead(notification)}
                      className={`px-4 py-2 rounded-lg font-semibold ${
                        notification.is_read
                          ? "bg-white border border-gray-400 text-gray-600 hover:bg-gray-100"
                          : "bg-white border border-green-900 text-green-900 hover:bg-green-100"
                      }`}
                    >
                      {notification.is_read ? "Mark as Unread" : "Mark as Read"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}