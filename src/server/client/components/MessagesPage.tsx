import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { Separator } from "../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { SimpleSelect } from "../components/ui/simple-select";
import type { IMessage } from "@/database";
import type { IConnection } from "@/server/connections/service";
import { type GroupMetadata } from "baileys";
import { client } from "../lib/api";
import {
  MessageCircle,
  Send,
  Users,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Image,
  Video,
  File
} from "lucide-react";

interface MessagesPageProps {}

export function MessagesPage({}: MessagesPageProps) {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [connections, setConnections] = useState<IConnection[]>([]);
  const [groups, setGroups] = useState<GroupMetadata[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [messageForm, setMessageForm] = useState({
    recipient: "",
    message: "",
    recipientType: "manual" as "manual" | "group",
  });

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    if (selectedDeviceId) {
      fetchMessages();
      fetchGroups();
    }
  }, [selectedDeviceId]);

  const fetchConnections = async () => {
    try {
      const response = await client.connections.get();
      setConnections(response.data?.data || []);

      // Auto-select first connection if available
      const defaultDeviceId = response.data?.data[0]?.deviceId || null;
      if (!selectedDeviceId && defaultDeviceId) {
        setSelectedDeviceId(defaultDeviceId);
      }
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch connections"
      );
      console.error("Error fetching connections:", err);
    }
  };

  const fetchMessages = async () => {
    if (!selectedDeviceId) return;

    try {
      setLoading(true);
      const response = await client.messages.get({
        query: { deviceId: selectedDeviceId, limit: 500, page: 1 },
      });
      setMessages(response.data?.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch messages");
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    if (!selectedDeviceId) return;

    try {
      const response = await client.groups.get({
        query: { deviceId: selectedDeviceId },
      });
      setGroups(response.data?.data || []);
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  };

  const handleSendMessage = async () => {
    if (
      !selectedDeviceId ||
      !messageForm.recipient ||
      !messageForm.message.trim()
    ) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setSending(true);
      setError(null);
      setSuccessMessage(null);

      // await api.sendTextMessage(selectedDeviceId, messageForm.recipient, messageForm.message);
      await client.messages["send-text-message"].post({
        deviceId: selectedDeviceId,
        recipient: messageForm.recipient,
        message: messageForm.message,
      });

      setSuccessMessage("Message sent successfully!");
      setMessageForm({ ...messageForm, message: "" });

      // Refresh messages after sending
      setTimeout(fetchMessages, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatRecipient = (recipient: string) => {
    // if (recipient.includes('@g.us')) {
    //   const group = groups.find(g => g.id === recipient);
    //   return group ? `${group.subject} (Group)` : `Group: ${recipient}`;
    // }
    // return recipient.replace('@s.whatsapp.net', '');
    return recipient;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-primary" />
            Messages
          </h2>
          <p className="text-muted-foreground">
            Send text, images, videos and documents via WhatsApp
          </p>
        </div>
        <Button
          onClick={fetchMessages}
          variant="outline"
          className="mt-4 sm:mt-0 gap-2"
          disabled={!selectedDeviceId || loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageCircle className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {successMessage && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              {successMessage}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Device</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="device-select">Device ID</Label>
            {connections.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  No connections available. Please start a connection first.
                </p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={fetchConnections}
                >
                  <span className="mr-2">🔄</span>
                  Refresh Connections
                </Button>
              </div>
            ) : (
              <SimpleSelect
                value={selectedDeviceId}
                onValueChange={setSelectedDeviceId}
                placeholder="Select a device"
                options={connections.map((connection) => ({
                  value: connection.deviceId,
                  label: `${connection.deviceId} (${
                    connection.state || "Unknown"
                  })`,
                }))}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Send Message */}
      {selectedDeviceId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Text Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Recipient Type</Label>
                <SimpleSelect
                  value={messageForm.recipientType}
                  onValueChange={(value: string) =>
                    setMessageForm({
                      ...messageForm,
                      recipientType: value as "manual" | "group",
                      recipient: "",
                    })
                  }
                  options={[
                    { value: "manual", label: "Manual (Phone/Group ID)" },
                    { value: "group", label: "Select from Groups" },
                  ]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient" className="text-sm font-medium">Recipient *</Label>
                {messageForm.recipientType === "group" ? (
                  <SimpleSelect
                    value={messageForm.recipient}
                    onValueChange={(value: string) =>
                      setMessageForm({ ...messageForm, recipient: value })
                    }
                    placeholder="Select a group"
                    options={groups.map((group) => ({
                      value: group.id,
                      label: group.subject,
                    }))}
                  />
                ) : (
                  <Input
                    id="recipient"
                    placeholder="123456789@s.whatsapp.net or 123456789@g.us"
                    value={messageForm.recipient}
                    onChange={(e) =>
                      setMessageForm({
                        ...messageForm,
                        recipient: e.target.value,
                      })
                    }
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">Message *</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                value={messageForm.message}
                onChange={(e) =>
                  setMessageForm({ ...messageForm, message: e.target.value })
                }
                className="min-h-[100px] transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSendMessage}
                disabled={
                  sending || !messageForm.recipient || !messageForm.message.trim()
                }
                className="gap-2"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages History */}
      {selectedDeviceId && (
        <Card>
          <CardHeader>
            <CardTitle>Message History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">💬</span>
                <h3 className="text-lg font-medium mb-2">No messages found</h3>
                <p className="text-muted-foreground">
                  No messages have been sent from this device yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          To: {formatRecipient(message.remote_jid)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {message.created_at.toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          message.status === 3 || message.status === 4
                            ? "bg-green-100 text-green-800"
                            : message.status === 1
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {message.status}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedDeviceId && connections.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">📱</span>
              <h3 className="text-lg font-medium mb-2">Select a device</h3>
              <p className="text-muted-foreground">
                Please select a device to send messages and view message
                history.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
