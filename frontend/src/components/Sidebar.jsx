import { useEffect, useState } from "react";
import { Users, Search, MessageCircle, Settings, X, Menu } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } =
    useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.fullName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesOnlineFilter = showOnlineOnly
      ? onlineUsers.includes(user._id)
      : true;
    return matchesSearch && matchesOnlineFilter;
  });

  if (isUsersLoading) return <SidebarSkeleton />;

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getStatusColor = (userId) => {
    return onlineUsers.includes(userId) ? "bg-emerald-500" : "bg-gray-400";
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      {isSidebarOpen ? null : (
        <button
          className="lg:hidden fixed top-30 left-4 z-50 p-3 m-3  rounded-md shadow-lg border  hover:scale-105 transition-transform"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="h-5 w-5 " />
        </button>
      )}

      {/* Themed Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 backdrop-blur-sm "
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:static top-0 left-0 h-full w-80  flex flex-col z-50 transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none border transition-colors`}
      >
        {/* Header */}
        <div className="p-6 border-b rounded-lg transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 mt-10">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold ">Messages</h1>
                <p className="text-sm ">{onlineUsers.length - 1} online</p>
              </div>
            </div>
            <button
              className="lg:hidden p-2 rounded-lg transition-colors"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-7 w-7 mt-8 hover:text-red-700 font-" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 " />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5  rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent  transition-all"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative inline-block w-11 h-6">
                <input
                  type="checkbox"
                  id="toggleOnline"
                  checked={showOnlineOnly}
                  onChange={(e) => setShowOnlineOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={`w-11 h-6 rounded-full transition-colors duration-300 ${
                    showOnlineOnly
                      ? "bg-blue-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                    showOnlineOnly ? "translate-x-5" : ""
                  }`}
                />
              </div>
              <span className="text-sm font-medium transition-colors">
                Online only
              </span>
            </label>
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto transition-colors">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32">
              <Users className="h-8 w-8 mb-2" />
              <p className="text-sm">
                {searchQuery ? "No users found" : "No online users"}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredUsers.map((user) => (
                <button
                  key={user._id}
                  onClick={() => {
                    setSelectedUser(user);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full p-3 rounded-xl text-left  transition-all duration-200 group ${
                    selectedUser?._id === user._id
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                      : "hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {user.profilePic ? (
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {getInitials(user.fullName)}
                          </span>
                        </div>
                      )}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 ${getStatusColor(
                          user._id
                        )} rounded-full border-2 border-white dark:border-gray-900`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold  truncate text-sm">
                          {user.fullName}
                        </h3>
                        <div className="flex items-center gap-1">
                          {user.unreadCount > 0 && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                              {user.unreadCount > 99 ? "99+" : user.unreadCount}
                            </span>
                          )}
                          <span className="text-xs ">
                            {onlineUsers.includes(user._id)
                              ? "Online"
                              : "Offline"}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm  truncate">
                        {user.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t ">
          <div className="flex items-center justify-between text-xs">
            <span>{filteredUsers.length} conversations</span>
            <span>Last updated now</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
