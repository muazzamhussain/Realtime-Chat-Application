import { useEffect, useState, useCallback, useMemo } from "react";
import { Users, Search, MessageCircle, X, Menu } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    messages, // Add this to get current messages from store
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();

  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userMessages, setUserMessages] = useState(new Map()); // Store messages per user
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Subscribe to real-time message updates
  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [subscribeToMessages, unsubscribeFromMessages]);

  // Fetch messages for all users (optimized approach)
  const fetchAllUserMessages = useCallback(async () => {
    if (!users.length || !authUser?._id) return;

    setIsLoadingMessages(true);
    const messageMap = new Map();

    try {
      // Fetch messages for each user in parallel
      const messagePromises = users.map(async (user) => {
        try {
          // You might need to modify this based on your store's getMessages implementation
          // If getMessages doesn't return messages directly, you might need a different approach
          const userMessages = await useChatStore
            .getState()
            .getMessages(user._id);
          return { userId: user._id, messages: userMessages || [] };
        } catch (error) {
          console.error(`Error fetching messages for user ${user._id}:`, error);
          return { userId: user._id, messages: [] };
        }
      });

      const results = await Promise.all(messagePromises);
      results.forEach(({ userId, messages }) => {
        messageMap.set(userId, messages);
      });

      setUserMessages(messageMap);
    } catch (error) {
      console.error("Error fetching user messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [users, authUser?._id]);

  // Fetch messages when users change
  useEffect(() => {
    fetchAllUserMessages();
  }, [fetchAllUserMessages]);

  // Update messages when store messages change (for real-time updates)
  useEffect(() => {
    if (!messages?.length) return;

    const latestMessage = messages[messages.length - 1];
    const userId =
      latestMessage.senderId === authUser?._id
        ? latestMessage.receiverId
        : latestMessage.senderId;

    setUserMessages((prev) => {
      const updated = new Map(prev);
      const existingMessages = updated.get(userId) || [];

      // Avoid duplicate messages
      const alreadyExists = existingMessages.find(
        (msg) => msg._id === latestMessage._id
      );
      if (!alreadyExists) {
        updated.set(userId, [...existingMessages, latestMessage]);
      }

      return updated;
    });
  }, [messages, authUser?._id]);

  // Process users with message data
  const usersWithMessageData = useMemo(() => {
    if (!users.length) return [];

    return users.map((user) => {
      const userMessageList = userMessages.get(user._id) || [];

      // Get last message
      const lastMessage =
        userMessageList.length > 0
          ? userMessageList[userMessageList.length - 1]
          : null;

      // Count unread messages (messages from this user that haven't been read by current user)
      const unreadCount = userMessageList.filter(
        (msg) =>
          msg.senderId === user._id &&
          msg.senderId !== authUser?._id &&
          !msg.isRead
      ).length;

      return {
        ...user,
        lastMessage:
          lastMessage?.text || (lastMessage?.image ? "📷 Image" : null),
        lastMessageTime: lastMessage?.createdAt || null,
        unreadCount,
        hasMessages: userMessageList.length > 0,
      };
    });
  }, [users, userMessages, authUser?._id]);

  // Filter users based on search and online status
  const filteredUsers = useMemo(() => {
    return usersWithMessageData.filter((user) => {
      const matchesSearch = user.fullName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesOnlineFilter = showOnlineOnly
        ? onlineUsers.includes(user._id)
        : true;
      return matchesSearch && matchesOnlineFilter;
    });
  }, [usersWithMessageData, searchQuery, showOnlineOnly, onlineUsers]);

  // Sort users by last message time and unread count
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      // Prioritize users with unread messages
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;

      // Then sort by last message time
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
      }
      if (a.lastMessageTime && !b.lastMessageTime) return -1;
      if (!a.lastMessageTime && b.lastMessageTime) return 1;

      // Finally sort alphabetically
      return a.fullName.localeCompare(b.fullName);
    });
  }, [filteredUsers]);

  const handleUserSelect = useCallback(
    (user) => {
      setSelectedUser(user);
      setIsSidebarOpen(false);

      // Mark messages as read when user is selected
      if (user._id && userMessages.has(user._id)) {
        const messages = userMessages.get(user._id);
        // You might need to implement a markMessagesAsRead function in your store
        // markMessagesAsRead(user._id);
      }
    },
    [setSelectedUser, userMessages]
  );

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

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      {!isSidebarOpen && (
        <button
          className="lg:hidden fixed top-30 left-4 z-50 p-3 m-3 rounded-md shadow-lg border hover:scale-105 transition-transform"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 backdrop-blur-sm bg-black/20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:static top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 flex flex-col z-50 transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none border border-gray-200 dark:border-gray-700`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 mt-10">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Messages
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {onlineUsers.length - 1} online
                </p>
              </div>
            </div>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-7 w-7 text-gray-500 hover:text-red-700" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative inline-block w-11 h-6">
                <input
                  type="checkbox"
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
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Online only
              </span>
            </label>
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : sortedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32">
              <Users className="h-8 w-8 mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">
                {searchQuery ? "No users found" : "No conversations"}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {sortedUsers.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleUserSelect(user)}
                  className={`w-full p-3 rounded-xl text-left transition-all duration-200 group ${
                    selectedUser?._id === user._id
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {user.profilePic ? (
                        <img
                          src={user.profilePic}
                          alt={user.fullName}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
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
                        <h3 className="font-semibold truncate text-sm text-gray-900 dark:text-white">
                          {user.fullName}
                        </h3>
                        <div className="flex items-center gap-2">
                          {user.lastMessageTime && (
                            <span className="text-xs text-gray-400">
                              {formatTime(user.lastMessageTime)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1">
                          {user.lastMessage || "No messages yet"}
                        </p>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {onlineUsers.includes(user._id)
                            ? "Online"
                            : "Offline"}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{sortedUsers.length} conversations</span>
            <span>{isLoadingMessages ? "Loading..." : "Updated now"}</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
