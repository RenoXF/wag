import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';
import { SimpleSelect } from '../components/ui/simple-select';
import type { GroupMetadata } from 'baileys';
import type { IConnection } from '@/server/connections/service';
import { client } from '../lib/api';
import {
  Users,
  Search,
  RefreshCw,
  Smartphone,
  AlertCircle,
  Loader2,
  Crown,
  Calendar,
  Hash
} from 'lucide-react';

interface GroupsPageProps {}

export function GroupsPage({}: GroupsPageProps) {
  const [groups, setGroups] = useState<GroupMetadata[]>([]);
  const [connections, setConnections] = useState<IConnection[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    if (selectedDeviceId) {
      fetchGroups();
    }
  }, [selectedDeviceId]);

  const fetchConnections = async () => {
    try {
      const response = await client.connections.get();
      const data = response.data?.data || [];
      setConnections(data);

      const  defaultDeviceId = data[0]?.deviceId || null;
      if (defaultDeviceId && !selectedDeviceId) {
        setSelectedDeviceId(defaultDeviceId);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch connections');
      console.error('Error fetching connections:', err);
    }
  };

  const fetchGroups = async () => {
    if (!selectedDeviceId) return;

    try {
      setLoading(true);
      const response = await client.groups.get({
        query: { deviceId: selectedDeviceId }
      });
      setGroups(response.data?.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshGroups = async () => {
    if (!selectedDeviceId) return;

    try {
      setRefreshing(true);
      setError(null);
      await client.groups.refresh.post({ deviceId: selectedDeviceId });

      // Wait a moment and then fetch the updated groups
      setTimeout(fetchGroups, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh groups');
      console.error('Error refreshing groups:', err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Groups
          </h2>
          <p className="text-muted-foreground">
            Browse and manage your WhatsApp groups
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button
            onClick={handleRefreshGroups}
            disabled={!selectedDeviceId || refreshing}
            variant="outline"
            className="gap-2"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
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

      {/* Device Selection */}
      <Card className="border-2 border-muted-foreground/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Select Device
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="device-select" className="text-sm font-medium">Device ID</Label>
            {connections.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h4 className="text-lg font-medium mb-2">No connections available</h4>
                <p className="text-muted-foreground mb-4">
                  Start a connection first to view groups
                </p>
                <Button variant="outline" className="gap-2" onClick={fetchConnections}>
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
                  label: `${connection.deviceId} (${connection.state || 'Unknown'})`
                }))}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Groups List */}
      {selectedDeviceId && (
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </CardContent>
            </Card>
          ) : groups.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <span className="text-4xl mb-4 block">👥</span>
                  <h3 className="text-lg font-medium mb-2">No groups found</h3>
                  <p className="text-muted-foreground mb-4">
                    No WhatsApp groups were found for this device. Try refreshing the groups metadata.
                  </p>
                  <Button onClick={handleRefreshGroups} disabled={refreshing}>
                    {refreshing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">🔄</span>
                        Refresh Groups
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <span className="mr-2">👥</span>
                      <span className="truncate">{group.subject}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Participants:</span>
                        <span className="font-medium">{group.participants.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Group ID:</span>
                        <span className="font-mono text-xs" title={group.id}>
                          {group.id}
                        </span>
                      </div>
                      <div className="pt-2">
                        {/* <Button variant="outline" size="sm" className="w-full">
                          <span className="mr-2">💬</span>
                          Send Message
                        </Button> */}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedDeviceId && connections.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">📱</span>
              <h3 className="text-lg font-medium mb-2">Select a device</h3>
              <p className="text-muted-foreground">
                Please select a device to view its WhatsApp groups.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
