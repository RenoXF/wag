import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/server/client/components/ui/card";
import { Button } from "@/server/client/components/ui/button";
import { ConnectionsPage } from "./components/ConnectionsPage";
import { GroupsPage } from "./components/GroupsPage";
import { MessagesPage } from "./components/MessagesPage";
import { client } from "./lib/api";
import "./index.css";
import { Navigation } from "./components/Navigation";


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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your WhatsApp Gateway</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Status</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Online</div>
            <p className="text-xs text-muted-foreground">
              Uptime: {status?.uptime ? Math.floor(status.uptime / 60) : 0} minutes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <span className="text-lg">🧠</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.memory || 0} MB</div>
            <p className="text-xs text-muted-foreground">Current memory consumption</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <span className="text-lg">⏰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.timestamp ? new Date(status.timestamp).toLocaleTimeString() : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Server timestamp</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button
            className="flex items-center gap-2"
            onClick={() => navigate('/connections')}
          >
            <span>🔗</span>
            Manage Connections
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => navigate('/groups')}
          >
            <span>👥</span>
            View Groups
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => navigate('/messages')}
          >
            <span>💬</span>
            Send Message
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
    <div className="min-h-screen bg-background">
      <Navigation
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
    </Router>
  );
}

export default App;
