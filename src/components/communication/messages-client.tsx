"use client";

import { useState, useEffect, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Mail,
  MailOpen,
  Send,
  Search,
  Plus,
  ArrowLeft,
  User,
  Loader2,
} from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image?: string | null;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  subject: string | null;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  sender: User;
  receiver: User;
}

interface Conversation {
  userId: string;
  user: User;
  lastMessage: Message;
  unreadCount: number;
}

interface MessagesClientProps {
  initialMessages: Message[];
  users: User[];
  currentUserId: string;
  userRole: string;
}

export function MessagesClient({
  initialMessages,
  users,
  currentUserId,
  userRole,
}: MessagesClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newMessage, setNewMessage] = useState({
    receiverId: "",
    subject: "",
    content: "",
  });

  // Group messages into conversations
  const conversations = useCallback((): Conversation[] => {
    const conversationMap = new Map<string, Conversation>();

    messages.forEach((msg) => {
      const otherUserId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
      const otherUser = msg.senderId === currentUserId ? msg.receiver : msg.sender;

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          userId: otherUserId,
          user: otherUser,
          lastMessage: msg,
          unreadCount: msg.receiverId === currentUserId && !msg.isRead ? 1 : 0,
        });
      } else {
        const existing = conversationMap.get(otherUserId)!;
        if (new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) {
          existing.lastMessage = msg;
        }
        if (msg.receiverId === currentUserId && !msg.isRead) {
          existing.unreadCount++;
        }
      }
    });

    return Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }, [messages, currentUserId]);

  // Get messages for selected conversation
  const conversationMessages = selectedConversation
    ? messages.filter(
        (m) =>
          (m.senderId === selectedConversation && m.receiverId === currentUserId) ||
          (m.senderId === currentUserId && m.receiverId === selectedConversation)
      ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  // Filter conversations by search
  const filteredConversations = conversations().filter(
    (c) =>
      c.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mark messages as read
  const markAsRead = async (messageIds: string[]) => {
    try {
      await fetch("/api/messages/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds }),
      });

      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(m.id) ? { ...m, isRead: true, readAt: new Date().toISOString() } : m
        )
      );
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  // Handle conversation selection
  const handleSelectConversation = (userId: string) => {
    setSelectedConversation(userId);
    const unreadMessages = messages.filter(
      (m) => m.senderId === userId && m.receiverId === currentUserId && !m.isRead
    );
    if (unreadMessages.length > 0) {
      markAsRead(unreadMessages.map((m) => m.id));
    }
  };

  // Send new message
  const handleSendMessage = async () => {
    if (!newMessage.receiverId || !newMessage.content.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMessage),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const sentMessage = await response.json();
      setMessages((prev) => [sentMessage, ...prev]);
      setNewMessage({ receiverId: "", subject: "", content: "" });
      setIsComposeOpen(false);
      toast.success("Message sent successfully");
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Get user initials for avatar
  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter users based on role restrictions
  const getAvailableRecipients = () => {
    // Students and parents can only message teachers and admins
    if (userRole === "STUDENT" || userRole === "PARENT") {
      return users.filter((u) => ["TEACHER", "SCHOOL_ADMIN", "SUPER_ADMIN"].includes(u.role));
    }
    // Teachers and admins can message anyone
    return users;
  };

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] rounded-lg border bg-background">
      {/* Conversations List */}
      <div className={`w-full md:w-80 border-r ${selectedConversation ? "hidden md:block" : ""}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Compose
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Message</DialogTitle>
                  <DialogDescription>
                    Send a message to another user
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">To</label>
                    <Select
                      value={newMessage.receiverId}
                      onValueChange={(value) =>
                        setNewMessage((prev) => ({ ...prev, receiverId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableRecipients().map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Input
                      value={newMessage.subject}
                      onChange={(e) =>
                        setNewMessage((prev) => ({ ...prev, subject: e.target.value }))
                      }
                      placeholder="Message subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <Textarea
                      value={newMessage.content}
                      onChange={(e) =>
                        setNewMessage((prev) => ({ ...prev, content: e.target.value }))
                      }
                      placeholder="Type your message..."
                      rows={5}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendMessage} disabled={isSending}>
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No conversations found
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => handleSelectConversation(conv.userId)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left ${
                  selectedConversation === conv.userId ? "bg-muted" : ""
                }`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={conv.user.image || undefined} />
                  <AvatarFallback>{getInitials(conv.user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{conv.user.name}</span>
                    {conv.unreadCount > 0 && (
                      <Badge variant="default" className="ml-2">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage.subject && (
                      <span className="font-medium">{conv.lastMessage.subject}: </span>
                    )}
                    {conv.lastMessage.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(conv.lastMessage.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Message Thread */}
      <div className={`flex-1 flex flex-col ${selectedConversation ? "" : "hidden md:flex"}`}>
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={
                    conversations().find((c) => c.userId === selectedConversation)?.user.image ||
                    undefined
                  }
                />
                <AvatarFallback>
                  {getInitials(
                    conversations().find((c) => c.userId === selectedConversation)?.user.name ||
                      null
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {
                    conversations().find((c) => c.userId === selectedConversation)?.user.name ||
                    "Unknown"
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {conversations().find((c) => c.userId === selectedConversation)?.user.role}
                </p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {conversationMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.senderId === currentUserId
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.subject && (
                        <p className="font-medium text-sm mb-1">{msg.subject}</p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.senderId === currentUserId
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {format(new Date(msg.createdAt), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Reply Input */}
            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Type your message..."
                  value={newMessage.content}
                  onChange={(e) =>
                    setNewMessage((prev) => ({ ...prev, content: e.target.value, receiverId: selectedConversation }))
                  }
                  className="flex-1"
                />
                <Button type="submit" disabled={isSending || !newMessage.content.trim()}>
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
