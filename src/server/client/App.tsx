import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/server/client/components/ui/card";
import { Button } from "@/server/client/components/ui/button";
import { Badge } from "@/server/client/components/ui/badge";
import { Skeleton } from "@/server/client/components/ui/skeleton";
import { Toaster } from "@/server/client/components/ui/sonner";
import { ConnectionsPage } from "./components/ConnectionsPage";
import { GroupsPage } from "./components/GroupsPage";
import { MessagesPage } from "./components/MessagesPage";
import { client } from "./lib/api";
import "./index.css";
import { Navigation } from "./components/Navigation";
import {
  Server,
  Brain,
  Clock,
  Link2,
  Users,
  MessageCircle,
  Activity,
  Zap,
  TrendingUp
} from "lucide-react";

// Dashboard Component
function Dashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<{
    uptime: number;
    timestamp: number;
    memory: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const result = await client.status.get();
      const data = result.data;
      setStatus(data);
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="space-y-3">
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-[150px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[100px] mb-2" />
                <Skeleton className="h-3 w-[200px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" />
          Dashboard
        </h2>
        <p className="text-muted-foreground">
          Overview of your WhatsApp Gateway system status and quick actions
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">
              Server Status
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                ONLINE
              </Badge>
              <Server className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              Active
            </div>
            <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1 mt-1">
              <Zap className="h-3 w-3" />
              Uptime: {status?.uptime ? formatUptime(status.uptime) : '0m'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Memory Usage
            </CardTitle>
            <Brain className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {status?.memory || 0} MB
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              Current consumption
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">
              Last Updated
            </CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {status?.timestamp ? new Date(status.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              }) : 'N/A'}
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
              {status?.timestamp ? new Date(status.timestamp).toLocaleDateString() : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            className="flex items-center gap-2 h-auto py-4 hover:scale-105 transition-transform"
            onClick={() => navigate('/connections')}
          >
            <Link2 className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Manage Connections</div>
              <div className="text-xs opacity-75">Add or configure devices</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2 h-auto py-4 hover:scale-105 transition-transform"
            onClick={() => navigate('/groups')}
          >
            <Users className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">View Groups</div>
              <div className="text-xs opacity-75">Browse WhatsApp groups</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2 h-auto py-4 hover:scale-105 transition-transform"
            onClick={() => navigate('/messages')}
          >
            <MessageCircle className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Send Message</div>
              <div className="text-xs opacity-75">Compose and send</div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}



// Layout component that wraps all pages
function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  return (
    <Router>
      <Layout />
      <Toaster />
    </Router>
  );
}

export default App;
