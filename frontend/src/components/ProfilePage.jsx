import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../apiClient';
import { useToast } from '../hooks/use-toast';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ThemeToggle } from './ThemeToggle';
import { Switch } from './ui/switch';
import { Skeleton } from './ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Camera, Sparkles } from 'lucide-react';
import zxcvbn from 'zxcvbn';
import NotificationBell from './NotificationBell';

const ProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState({ firstName: '', lastName: '', email: '', bio: '', avatar: null });
  const [notificationPrefs, setNotificationPrefs] = useState({ email: true, push: false });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const getAvatarUrl = (path) => {
    if (!path) return null;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
    return `${baseUrl}/uploads/${path}`;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/profile');
        const data = res.data;
        setUserData({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || '',
          bio: data.bio || '',
          avatar: data.avatar
        });
        if (data.avatar) setAvatarPreview(getAvatarUrl(data.avatar));
        if (data.notification_preferences) setNotificationPrefs(data.notification_preferences);
      } catch (err) {
        toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      if (password && password !== confirmPassword) {
        toast({ title: "Mismatch", description: "Passwords do not match", variant: "destructive" });
        setSaving(false);
        return;
      }

      const payload = {
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        bio: userData.bio,
        notification_preferences: notificationPrefs
      };
      if (password) payload.password = password;

      await apiClient.put('/profile', payload);
      toast({ title: "Saved", description: "Profile updated successfully" });
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUserData({ ...userData, avatar: file });
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarUpload = async () => {
    if (!userData.avatar || typeof userData.avatar === 'string') return;
    setSaving(true);
    const formData = new FormData();
    formData.append('avatar', userData.avatar);
    try {
      const res = await apiClient.post('/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUserData({ ...userData, avatar: res.data.avatar_path });
      setAvatarPreview(getAvatarUrl(res.data.avatar_path));
      toast({ title: "Avatar Updated" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to upload avatar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await apiClient.delete('/profile');
      localStorage.removeItem('token');
      navigate('/login');
      toast({ title: "Account Deleted" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete account", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const passwordStrength = password ? zxcvbn(password).score : 0;
  const strengthColors = ['bg-slate-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[500px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="mr-1">
                <ArrowLeft size={20} />
              </Button>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="text-white" size={18} />
              </div>
              <h1 className="text-lg font-bold">Profile & Settings</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
          >
            {/* Header Gradient Strip */}
            <div className="h-20 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
              <div className="absolute -bottom-10 left-6">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-4 border-white dark:border-slate-900 shadow-lg">
                    <AvatarImage src={avatarPreview} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      {userData.firstName?.[0]}{userData.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Camera size={14} className="text-slate-600 dark:text-slate-300" />
                  </button>
                  <Input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="pt-14 p-6">
              {/* Upload button if new avatar selected */}
              {userData.avatar && typeof userData.avatar !== 'string' && (
                <div className="mb-6">
                  <Button size="sm" onClick={handleAvatarUpload} disabled={saving}>
                    {saving ? 'Uploading...' : 'Save New Avatar'}
                  </Button>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-5">
                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">First Name</Label>
                    <Input
                      value={userData.firstName}
                      onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                      className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</Label>
                    <Input
                      value={userData.lastName}
                      onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                      className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bio</Label>
                  <Textarea
                    value={userData.bio}
                    onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 min-h-[80px]"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</Label>
                  <Input
                    type="email"
                    value={userData.email}
                    onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                    className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                  />
                </div>

                {/* Password Section */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">New Password</Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      />
                      {password && (
                        <div className="flex gap-1 mt-1">
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < passwordStrength ? strengthColors[passwordStrength] : 'bg-slate-200 dark:bg-slate-700'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Confirm Password</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Notification Preferences */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Notification Preferences</h3>
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Switch
                        checked={notificationPrefs.email}
                        onCheckedChange={(c) => setNotificationPrefs({ ...notificationPrefs, email: c })}
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Email Notifications</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Switch
                        checked={notificationPrefs.push}
                        onCheckedChange={(c) => setNotificationPrefs({ ...notificationPrefs, push: c })}
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Push Notifications</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950">
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently delete all your data.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleLogout}>
                    Logout
                  </Button>
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                  >
                    {saving ? 'Saving...' : 'Update Profile'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;