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
        // Replace this later with your real backend route
        // Example:
        // const response = await apiFetch(`/api/notifications/${personId}`, {
        //   headers: { Authorization: `Bearer ${token}` },
        // });

        // Temporary mock data for UI development
        const mockNotifications = [
          {
            Notification_ID: 1,
            type: 1,
            message: "Your hold is ready for pickup.",
            is_read: 0,
            created_at: "2026-04-06T10:30:00",
          },
          {
            Notification_ID: 2,
            type: 2,
            message: "A fee has been added to your account.",
            is_read: 1,
            created_at: "2026-04-05T14:15:00",
          },
          {
            Notification_ID: 3,
            type: 3,
            message: "Reminder: one of your borrowed items is due soon.",
            is_read: 0,
            created_at: "2026-04-04T09:00:00",
          },
        ];

        setNotifications(mockNotifications);
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
    switch (type) {
      case 1:
        return "Hold Update";
      case 2:
        return "Fee Update";
      case 3:
        return "Reminder";
      default:
        return "Notification";
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.Notification_ID === notificationId
          ? { ...notification, is_read: 1 }
          : notification
      )
    );

    // Later:
    // await apiFetch(`/api/notifications/${notificationId}/read`, {
    //   method: "PATCH",
    //   headers: { Authorization: `Bearer ${token}` },
    // });
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        is_read: 1,
      }))
    );

    // Later:
    // await apiFetch(`/api/notifications/read-all/${personId}`, {
    //   method: "PATCH",
    //   headers: { Authorization: `Bearer ${token}` },
    // });
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
                      onClick={() => handleMarkAsRead(notification.Notification_ID)}
                      disabled={notification.is_read}
                      className={`px-4 py-2 rounded-lg font-semibold ${
                        notification.is_read
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-white border border-green-900 text-green-900 hover:bg-green-100"
                      }`}
                    >
                      {notification.is_read ? "Read" : "Mark as Read"}
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