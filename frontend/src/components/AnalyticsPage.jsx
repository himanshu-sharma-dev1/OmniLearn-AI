// src/components/AnalyticsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../apiClient';
import { useToast } from '../hooks/use-toast';
import {
    ArrowLeft,
    Clock,
    Brain,
    Trophy,
    Flame,
    TrendingUp,
    BookOpen,
    BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { Skeleton } from '@/components/ui/skeleton';

// Simple bar chart component (no external library needed)
const SimpleBarChart = ({ data, maxValue }) => {
    if (!data || data.length === 0) return <p className="text-muted-foreground text-sm">No data yet</p>;

    return (
        <div className="space-y-2">
            {data.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-24 truncate">{item.course_name}</span>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((item.total_minutes / maxValue) * 100, 100)}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                        />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">{item.total_minutes}m</span>
                </div>
            ))}
        </div>
    );
};

// Simple line chart for quiz scores
const SimpleLineChart = ({ data }) => {
    if (!data || data.length === 0) return <p className="text-muted-foreground text-sm">No quizzes taken yet</p>;

    const maxScore = 100;
    const chartHeight = 120;
    const chartWidth = 300;
    const padding = 20;

    const points = data.map((item, index) => ({
        x: padding + (index * (chartWidth - 2 * padding)) / Math.max(data.length - 1, 1),
        y: chartHeight - padding - (item.score / maxScore) * (chartHeight - 2 * padding),
        score: item.score
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(percent => {
                const y = chartHeight - padding - (percent / 100) * (chartHeight - 2 * padding);
                return (
                    <g key={percent}>
                        <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="currentColor" strokeOpacity={0.1} />
                        <text x={5} y={y + 4} fontSize={10} fill="currentColor" opacity={0.5}>{percent}</text>
                    </g>
                );
            })}

            {/* Line */}
            <motion.path
                d={pathD}
                fill="none"
                stroke="url(#gradient)"
                strokeWidth={2}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
            />

            {/* Points */}
            {points.map((p, i) => (
                <motion.circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill="white"
                    stroke="url(#gradient)"
                    strokeWidth={2}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                />
            ))}

            {/* Gradient definition */}
            <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
            </defs>
        </svg>
    );
};

// Streak calendar component
const StreakCalendar = ({ dailyActivity }) => {
    const today = new Date();
    const days = [];

    // Generate last 30 days
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const activity = dailyActivity[dateKey];
        days.push({ date: dateKey, hasActivity: !!activity, activity });
    }

    return (
        <div className="grid grid-cols-10 gap-1">
            {days.map((day, index) => (
                <motion.div
                    key={day.date}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`w-6 h-6 rounded-sm ${day.hasActivity
                            ? 'bg-gradient-to-br from-emerald-400 to-green-500'
                            : 'bg-muted/50'
                        }`}
                    title={`${day.date}: ${day.hasActivity ? 'Active' : 'No activity'}`}
                />
            ))}
        </div>
    );
};

// Stat card component
const StatCard = ({ icon: Icon, title, value, subtitle, gradient }) => (
    <GlassCard className="p-6">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="text-3xl font-bold mt-1">{value}</p>
                {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    </GlassCard>
);

const AnalyticsPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [dailyActivity, setDailyActivity] = useState({});

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const [summaryRes, activityRes] = await Promise.all([
                apiClient.get('/analytics/summary'),
                apiClient.get('/analytics/daily-activity')
            ]);
            setAnalytics(summaryRes.data);
            setDailyActivity(activityRes.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            toast({ title: "Error", description: "Failed to load analytics.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <Skeleton className="h-8 w-40 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </div>
        );
    }

    const maxStudyTime = Math.max(...(analytics?.study_time_by_course?.map(c => c.total_minutes) || [1]), 1);

    return (
        <div className="min-h-screen relative">
            <AnimatedBackground />

            <div className="container mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft size={18} className="mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">Analytics</h1>
                            <p className="text-muted-foreground">Track your learning progress</p>
                        </div>
                    </div>
                </motion.div>

                {/* Stat Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                >
                    <StatCard
                        icon={Clock}
                        title="Total Study Time"
                        value={`${analytics?.total_study_minutes || 0}m`}
                        subtitle="Last 30 days"
                        gradient="from-blue-500 to-cyan-500"
                    />
                    <StatCard
                        icon={Brain}
                        title="Quizzes Completed"
                        value={analytics?.total_quizzes || 0}
                        subtitle="All time"
                        gradient="from-purple-500 to-pink-500"
                    />
                    <StatCard
                        icon={Trophy}
                        title="Average Score"
                        value={`${analytics?.average_quiz_score || 0}%`}
                        subtitle="Quiz performance"
                        gradient="from-amber-500 to-orange-500"
                    />
                    <StatCard
                        icon={Flame}
                        title="Learning Streak"
                        value={`${analytics?.learning_streak_days || 0} days`}
                        subtitle="Keep it up!"
                        gradient="from-red-500 to-rose-500"
                    />
                </motion.div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Quiz Score Trend */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp size={20} />
                                    Quiz Score Trend
                                </CardTitle>
                                <CardDescription>Your last 10 quiz scores</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SimpleLineChart data={analytics?.quiz_score_trend || []} />
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Study Time by Course */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 size={20} />
                                    Study Time by Course
                                </CardTitle>
                                <CardDescription>Minutes spent per course</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SimpleBarChart
                                    data={analytics?.study_time_by_course || []}
                                    maxValue={maxStudyTime}
                                />
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Activity Calendar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen size={20} />
                                Learning Activity (Last 30 Days)
                            </CardTitle>
                            <CardDescription>Green = Active day</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <StreakCalendar dailyActivity={dailyActivity} />
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
