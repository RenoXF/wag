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
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { Separator } from "../components/ui/separator";
import { Modal } from "../components/ui/modal";
import { QrCodeComponent } from "../components/ui/qr-code";
import { client } from "../lib/api";
import type { IConnection } from "@/server/connections/service";
import type { WAConnectionState } from "baileys";
import {
  Plus,
  Smartphone,
  Wifi,
  WifiOff,
  QrCode,
  Trash2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";

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

  const getStatusBadgeVariant = (status: WAConnectionState) => {
    switch (status) {
      case "open":
        return "default"; // Green
      case "connecting":
        return "secondary"; // Yellow
      case "close":
        return "destructive"; // Red
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: WAConnectionState) => {
    switch (status) {
      case "open":
        return <CheckCircle2 className="h-4 w-4" />;
      case "connecting":
        return <Clock className="h-4 w-4" />;
      case "close":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <WifiOff className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-6 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-[80px]" />
                  <Skeleton className="h-8 w-[80px]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Smartphone className="h-8 w-8 text-primary" />
            Connections
          </h2>
          <p className="text-muted-foreground">
            Manage your WhatsApp device connections and monitor their status
          </p>
        </div>
        <Button
          onClick={fetchConnections}
          variant="outline"
          className="mt-4 sm:mt-0 gap-2"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Connection */}
      <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Start New Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deviceId" className="text-sm font-medium">
                Device ID *
              </Label>
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
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for your WhatsApp device
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookUrl" className="text-sm font-medium">
                Webhook URL (Optional)
              </Label>
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
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                URL to receive WhatsApp events (optional)
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleStartConnection}
              disabled={isCreating || !newConnection.deviceId.trim()}
              className="gap-2"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              {isCreating ? "Starting Connection..." : "Start Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Connections List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Active Connections</h3>
        {connections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="text-lg font-medium mb-2">No connections found</h4>
              <p className="text-muted-foreground mb-4">
                Start your first WhatsApp connection to begin
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connections.map((connection) => (
              <Card key={connection.deviceId} className="hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      {connection.deviceId}
                    </CardTitle>
                    <Badge variant={getStatusBadgeVariant(connection.state)} className="gap-1">
                      {getStatusIcon(connection.state)}
                      {connection.state}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {connection.user && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">User:</span>
                      <div className="mt-1">
                        <p className="font-medium">{connection.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {connection.user.phoneNumber || connection.user.id}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShowQrCode(connection.deviceId)}
                      disabled={qrLoading === connection.deviceId || connection.state === "open"}
                      className="gap-1 flex-1"
                    >
                      {qrLoading === connection.deviceId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4" />
                      )}
                      {connection.state === "open" ? "Connected" : "Show QR"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStopConnection(connection.deviceId)}
                      disabled={actionLoading === connection.deviceId}
                      className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      {actionLoading === connection.deviceId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
