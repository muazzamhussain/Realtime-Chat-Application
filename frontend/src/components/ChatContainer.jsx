import { useState, useEffect, useRef } from "react";
import { Download } from "lucide-react"; // Added missing import
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { formatMessageTime } from "../lib/utils";

const handleDownload = (imageURL, filename) => {
  const link = document.createElement("a");
  link.href = imageURL;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null); // Added for better scroll management

  const [zoomedMessageId, setZoomedMessageId] = useState(null);

  useEffect(() => {
    if (selectedUser?._id) {
      // Added null check
      getMessages(selectedUser._id);
      subscribeToMessages();
    }
    return () => unsubscribeFromMessages();
  }, [
    selectedUser?._id, // Added optional chaining
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages?.length) {
      // Added length check
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Close zoom when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (zoomedMessageId && !event.target.closest(".chat-bubble")) {
        setZoomedMessageId(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [zoomedMessageId]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages?.map(
          (
            message,
            index // Added optional chaining
          ) => (
            <div
              key={message._id}
              className={`chat ${
                message.senderId === authUser?._id ? "chat-end" : "chat-start"
              }`}
              ref={index === messages.length - 1 ? messageEndRef : null} // Only attach ref to last message
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      message.senderId === authUser?._id
                        ? authUser?.profilePic || "/avatar.png"
                        : selectedUser?.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                    onError={(e) => {
                      // Added error handling for broken images
                      e.target.src = "/avatar.png";
                    }}
                  />
                </div>
              </div>
              <div className="chat-header mb-1">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>
              <div className="chat-bubble flex flex-col relative group">
                {message.image && (
                  <div className="relative">
                    <img
                      src={message.image}
                      alt="Attachment"
                      className={`rounded-md mb-2 cursor-pointer transition-all duration-300 ${
                        zoomedMessageId === message._id
                          ? "w-full max-w-none"
                          : "sm:max-w-[200px] max-w-[150px]"
                      }`}
                      onClick={() =>
                        setZoomedMessageId(
                          zoomedMessageId === message._id ? null : message._id
                        )
                      }
                      onError={(e) => {
                        // Added error handling for broken images
                        e.target.style.display = "none";
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering zoom
                        handleDownload(
                          message.image,
                          `chat-image-${message._id}.jpg`
                        );
                      }}
                      className="absolute top-2 right-2 bg-white hover:bg-gray-100 rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition-all duration-200"
                      title="Download image"
                      aria-label="Download image"
                    >
                      <Download size={16} className="text-gray-700" />
                    </button>
                  </div>
                )}

                {message.text && (
                  <p className="whitespace-pre-wrap break-words">
                    {message.text}
                  </p>
                )}
              </div>
            </div>
          )
        )}
        {/* Scroll anchor */}
        <div ref={messageEndRef} />
      </div>
      <MessageInput />
    </div>
  );
};

export default ChatContainer;
