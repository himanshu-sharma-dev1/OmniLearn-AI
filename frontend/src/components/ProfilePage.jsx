import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from './use-theme';
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
} from "@/components/ui/alert-dialog"
import zxcvbn from 'zxcvbn';
import { Switch } from './ui/switch';

const ProfilePage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: true,
    push: false,
  });
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { theme } = useTheme();

  const getAvatarUrl = (path) => {
    if (!path) return null;
    // Use the apiClient's baseURL to construct the full URL
    return `${apiClient.defaults.baseURL}/${path}`;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/profile');
        const userData = response.data;
        setFirstName(userData.first_name || '');
        setLastName(userData.last_name || '');
        setBio(userData.bio || '');
        setEmail(userData.email);
        setAvatar(userData.avatar);
        if (userData.avatar) {
          setAvatarPreview(getAvatarUrl(userData.avatar));
        }
        setNotificationPreferences(userData.notification_preferences || { email: true, push: false });
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Failed to load profile',
          description: 'Could not retrieve your profile data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [toast]);

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (newPassword) {
      const result = zxcvbn(newPassword);
      setPasswordStrength(result.score);
    } else {
      setPasswordStrength(0);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatar || typeof avatar === 'string') return;

    const formData = new FormData();
    formData.append('avatar', avatar);

    setLoading(true);
    try {
      const response = await apiClient.post('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const newAvatarPath = response.data.avatar_path;
      setAvatar(newAvatarPath);
      setAvatarPreview(getAvatarUrl(newAvatarPath));
      toast({
        title: 'Avatar Updated',
        description: 'Your new avatar has been saved.',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Avatar Upload Failed',
        description: error.response?.data?.msg || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (password && password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        bio,
        email,
        notification_preferences: notificationPreferences,
      };
      if (password) {
        payload.password = password;
      }

      const response = await apiClient.put('/profile', payload);
      toast({
        title: 'Profile Updated',
        description: response.data.msg,
      });
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: error.response?.data?.msg || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await apiClient.delete('/profile');
      toast({
        title: 'Account Deleted',
        description: 'Your account has been successfully deleted.',
      });
      handleLogout();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Deletion Failed',
        description: error.response?.data?.msg || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const passwordStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
        return 'bg-gray-200';
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-yellow-500';
      case 3:
        return 'bg-blue-500';
      case 4:
        return 'bg-green-500';
      default:
        return 'bg-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">User Profile & Settings</CardTitle>
              <CardDescription>
                Manage your account settings and update your profile information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarPreview} />
                    <AvatarFallback>{firstName?.[0]}{lastName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-2">
                      <Button type="button" onClick={() => fileInputRef.current.click()}>
                        Change Avatar
                      </Button>
                      <Input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleAvatarChange}
                          className="hidden"
                          accept="image/*"
                      />
                      <Button type="button" onClick={handleAvatarUpload} disabled={!avatar || typeof avatar === 'string'}>
                          Save Avatar
                      </Button>
                  </div>
                </div>
                <ThemeToggle />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="firstName" className="text-base font-medium">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="text-base"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName" className="text-base font-medium">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="text-base"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio" className="text-base font-medium">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a little about yourself"
                  className="text-base"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-base font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-base"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-base font-medium">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Leave blank to keep current password"
                  className="text-base"
                />
                {password && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                    <div className={`h-2.5 rounded-full ${passwordStrengthColor()}`} style={{ width: `${(passwordStrength + 1) * 20}%` }}></div>
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword" className="text-base font-medium">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="text-base"
                />
              </div>
              <div>
                <Label className="text-base font-medium">Notification Preferences</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="email-notifications"
                      checked={notificationPreferences.email}
                      onCheckedChange={(checked) => setNotificationPreferences({ ...notificationPreferences, email: checked })}
                    />
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="push-notifications"
                      checked={notificationPreferences.push}
                      onCheckedChange={(checked) => setNotificationPreferences({ ...notificationPreferences, push: checked })}
                    />
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete Account</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account
                            and remove your data from our servers.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAccount}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline" onClick={handleLogout}>
                        Logout
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                        {loading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Updating...
                        </>
                        ) : 'Update Profile'}
                    </Button>
                </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;