import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Modal } from "../components/ui/modal";
import { QrCodeComponent } from "../components/ui/qr-code";
import { client } from "../lib/api";
import type { IConnection } from "@/server/connections/service";
import type { WAConnectionState } from "baileys";

interface ConnectionsPageProps {}

export function ConnectionsPage({}: ConnectionsPageProps) {
  const [connections, setConnections] = useState<IConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newConnection, setNewConnection] = useState({
    deviceId: "",
    webhookUrl: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [qrCodeModal, setQrCodeModal] = useState<{
    isOpen: boolean;
    deviceId: string;
    qrCode: string;
  }>({
    isOpen: false,
    deviceId: "",
    qrCode: "",
  });
  const [qrLoading, setQrLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  // Auto-refresh every 3 seconds
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     fetchConnections();
  //   }, 3000);

  //   return () => clearInterval(interval);
  // }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await client.connections.get();
      if (response.data?.data) {
        setConnections(response.data.data);
        setError(null);
      } else {
        setError("No connections data found");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch connections"
      );
      console.error("Error fetching connections:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConnection = async () => {
    if (!newConnection.deviceId.trim()) {
      setError("Device ID is required");
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      await client.connections.start.post({
        deviceId: newConnection.deviceId,
        webhookUrl: newConnection.webhookUrl || undefined,
      });

      // Reset form
      setNewConnection({ deviceId: "", webhookUrl: "" });

      // Refresh connections list
      await fetchConnections();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start connection"
      );
      console.error("Error starting connection:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStopConnection = async (deviceId: string) => {
    try {
      setActionLoading(deviceId);
      setError(null);
      // await api.stopConnection(deviceId);
      await client.connections.stop.post({ deviceId });
      await fetchConnections();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to stop connection"
      );
      console.error("Error stopping connection:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogoutConnection = async (deviceId: string) => {
    try {
      setActionLoading(deviceId);
      setError(null);
      // await api.logoutConnection(deviceId);
      await client.connections.logout.post({ deviceId });
      await fetchConnections();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to logout connection"
      );
      console.error("Error logging out connection:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleShowQrCode = async (deviceId: string) => {
    try {
      setQrLoading(deviceId);
      setError(null);

      const response = await client.connections["qr-code"].post({ deviceId });

      if (response.data?.data?.qrCode) {
        setQrCodeModal({
          isOpen: true,
          deviceId,
          qrCode: response.data.data.qrCode,
        });
      } else {
        setError("QR code not available for this connection");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to get QR code"
      );
      console.error("Error fetching QR code:", err);
    } finally {
      setQrLoading(null);
    }
  };

  const closeQrModal = () => {
    setQrCodeModal({
      isOpen: false,
      deviceId: "",
      qrCode: "",
    });
  };

  const getStatusColor = (status: WAConnectionState) => {
    switch (status) {
      case "open":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "close":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Connections</h2>
          <p className="text-muted-foreground">
            Manage your WhatsApp connections
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Connections</h2>
          <p className="text-muted-foreground">
            Manage your WhatsApp connections
          </p>
        </div>
        <Button
          onClick={fetchConnections}
          variant="outline"
          className="mt-4 sm:mt-0"
        >
          <span className="mr-2">🔄</span>
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center text-destructive">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Start New Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deviceId">Device ID *</Label>
              <Input
                id="deviceId"
                placeholder="e.g., device1, my-phone"
                value={newConnection.deviceId}
                onChange={(e) =>
                  setNewConnection({
                    ...newConnection,
                    deviceId: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
              <Input
                id="webhookUrl"
                placeholder="https://your-webhook-url.com/webhook"
                value={newConnection.webhookUrl}
                onChange={(e) =>
                  setNewConnection({
                    ...newConnection,
                    webhookUrl: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <Button
            onClick={handleStartConnection}
            disabled={isCreating || !newConnection.deviceId.trim()}
            className="w-full sm:w-auto"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Starting...
              </>
            ) : (
              <>
                <span className="mr-2">🚀</span>
                Start Connection
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Connections List */}
      <div className="grid gap-4">
        {connections.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">📱</span>
                <h3 className="text-lg font-medium mb-2">
                  No connections found
                </h3>
                <p className="text-muted-foreground">
                  Start your first WhatsApp connection to get started.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          connections.map((connection) => (
            <Card key={connection.deviceId}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center space-x-1">
                    <div
                      className={`h-3 w-3 rounded-full ${getStatusColor(
                        connection.state
                      )}`}
                    ></div>
                    <CardTitle className="text-lg">
                      {connection.deviceId}
                    </CardTitle>
                  </div>
                  <div className="flex items-center space-x-0 mt-0 sm:mt-0">
                    <span className="text-sm text-muted-foreground capitalize">
                      {connection.state || "Unknown"}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* {connection.webhookUrl && (
                    <div>
                      <Label className="text-sm font-medium">Webhook URL</Label>
                      <p className="text-sm text-muted-foreground break-all">
                        {connection.webhookUrl}
                      </p>
                    </div>
                  )} */}

                  {connection.user && (
                    <div>
                      <Label className="text-sm font-medium">
                        { connection.user.name}
                      </Label>
                      <div className="flex flex-col gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {connection.user.phoneNumber || connection.user.id}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {connection.state === "connecting" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowQrCode(connection.deviceId)}
                        disabled={qrLoading === connection.deviceId}
                        className="flex items-center"
                      >
                        {qrLoading === connection.deviceId ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        ) : (
                          <span className="mr-2">📱</span>
                        )}
                        Show QR Code
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStopConnection(connection.deviceId)}
                      disabled={actionLoading === connection.deviceId}
                      className="flex items-center"
                    >
                      {actionLoading === connection.deviceId ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      ) : (
                        <span className="mr-2">⏹️</span>
                      )}
                      Stop
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleLogoutConnection(connection.deviceId)
                      }
                      disabled={actionLoading === connection.deviceId}
                      className="flex items-center"
                    >
                      {actionLoading === connection.deviceId ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      ) : (
                        <span className="mr-2">🚪</span>
                      )}
                      Logout
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* QR Code Modal */}
      <Modal
        isOpen={qrCodeModal.isOpen}
        onClose={closeQrModal}
        title={`QR Code for ${qrCodeModal.deviceId}`}
      >
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Scan this QR code with your WhatsApp mobile app to connect.
            </p>
            {qrCodeModal.qrCode && (
              <QrCodeComponent
                value={qrCodeModal.qrCode}
                size={256}
                className="mb-4"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Open WhatsApp → Settings → Linked Devices → Link a Device
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={closeQrModal}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
