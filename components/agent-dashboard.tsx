"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useMessageManager } from "@/lib/message-manager"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { MessageSquare, Clock, CheckCircle, XCircle, TrendingUp, Users, Target, Download, Filter } from "lucide-react"

interface AgentDashboardProps {
  onSwitchToSwipe: () => void
}

export function AgentDashboard({ onSwitchToSwipe }: AgentDashboardProps) {
  const { stats, getRecentActivity } = useMessageManager()
  const recentActivity = getRecentActivity()

  const categoryData = [
    { name: "Account Access", value: 35, color: "#6366f1" },
    { name: "Billing", value: 28, color: "#3b82f6" },
    { name: "Technical", value: 22, color: "#10b981" },
    { name: "Feature Request", value: 10, color: "#f59e0b" },
    { name: "General", value: 5, color: "#ef4444" },
  ]

  const timeSeriesData = [
    { time: "9 AM", messages: 45, approved: 32, rejected: 13 },
    { time: "10 AM", messages: 52, approved: 38, rejected: 14 },
    { time: "11 AM", messages: 38, approved: 28, rejected: 10 },
    { time: "12 PM", messages: 41, approved: 29, rejected: 12 },
    { time: "1 PM", messages: 35, approved: 25, rejected: 10 },
    { time: "2 PM", messages: 48, approved: 34, rejected: 14 },
    { time: "3 PM", messages: 43, approved: 31, rejected: 12 },
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "edited":
        return <MessageSquare className="h-5 w-5 text-blue-600" />
      case "received":
        return <MessageSquare className="h-5 w-5 text-blue-600" />
      default:
        return <MessageSquare className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "approved":
        return "bg-green-50 border-green-200"
      case "rejected":
        return "bg-red-50 border-red-200"
      case "edited":
        return "bg-blue-50 border-blue-200"
      case "received":
        return "bg-blue-50 border-blue-200"
      default:
        return "bg-muted/50 border-border"
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Agent Dashboard</h1>
          <p className="text-muted-foreground">Monitor performance and manage customer support operations</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={onSwitchToSwipe} className="bg-accent hover:bg-accent/90">
            <MessageSquare className="h-4 w-4 mr-2" />
            Start Reviewing
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{stats.pendingMessages}</span> pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvalRate.toFixed(1)}%</div>
            <Progress value={stats.approvalRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime.toFixed(1)} min</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">-0.5 min</span> from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today Processed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayProcessed}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingMessages} messages pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Message Volume Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Message Volume Today</CardTitle>
              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="approved" stackId="a" fill="#10b981" name="Approved" />
                <Bar dataKey="rejected" stackId="a" fill="#ef4444" name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Message Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {categoryData.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <span className="text-sm font-medium">{category.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.slice(0, 4).map((activity, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg ${getActivityColor(activity.type)}`}
                >
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {activity.type === "approved" && "Response approved"}
                      {activity.type === "rejected" && "Response rejected"}
                      {activity.type === "edited" && "Response edited"}
                      {activity.type === "received" && "New message received"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.message.customerName} - {activity.message.category || "General"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Daily Goal Progress</span>
                  <span className="text-sm text-muted-foreground">{stats.todayProcessed}/100</span>
                </div>
                <Progress value={stats.todayProcessed} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <div className="text-2xl font-bold text-accent">{stats.approvedMessages}</div>
                  <div className="text-xs text-muted-foreground">Approved</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div className="text-2xl font-bold text-destructive">{stats.rejectedMessages}</div>
                  <div className="text-xs text-muted-foreground">Rejected</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Efficiency Score</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+15%</span> improvement this week
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
