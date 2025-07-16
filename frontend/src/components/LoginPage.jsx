// src/components/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../apiClient';
import LoginIllustration from './LoginIllustration';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '../hooks/use-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email.trim() || !password.trim()) {
      toast({ title: "Error", description: "Email and password are required.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const endpoint = isLogin ? '/login' : '/register';

    try {
      const response = await apiClient.post(endpoint, { email, password });
      if (isLogin) {
        localStorage.setItem('token', response.data.access_token);
        toast({ title: "Success", description: "Login successful!" });
        navigate('/dashboard', { replace: true });
      } else {
        toast({ title: "Success", description: "Registration successful! Please log in." });
        setIsLogin(true);
        // Clear fields for login
        setEmail('');
        setPassword('');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'An error occurred.';
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex justify-center items-center p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 max-w-5xl w-full bg-card rounded-lg shadow-xl overflow-hidden border">

        {/* Left Column: Illustration */}
        <div className="hidden md:flex flex-col justify-center items-center bg-primary p-12 text-primary-foreground">
            <div className="w-full max-w-md text-center">
                <h2 className="text-3xl font-bold mb-4">Welcome to Intelli-Tutor</h2>
                <p className="text-primary-foreground/80 mb-8">
                    Your personal AI-powered learning companion.
                </p>
                <LoginIllustration />
            </div>
        </div>

        {/* Right Column: Form */}
        <div className="flex justify-center items-center p-8">
          <motion.div
            key={isLogin ? 'login' : 'register'}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <Card className="border-none shadow-none bg-transparent">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">{isLogin ? 'Welcome Back!' : 'Create an Account'}</CardTitle>
                <CardDescription>
                  Enter your credentials to {isLogin ? 'access your dashboard' : 'get started'}.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="grid gap-4">
                  <div className="grid gap-2 relative">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@example.com" 
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {email && (
                      <button
                        type="button"
                        onClick={() => setEmail('')}
                        className="absolute right-3 top-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Clear email"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2 relative">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      required 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    {password && (
                      <button
                        type="button"
                        onClick={() => setPassword('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Clear password"
                      >
                        <X size={18} />
                      </button>
                    )}
                    <div className="text-right mt-1">
                      <Link to="/forgot-password"
                         className="text-sm text-blue-600 hover:underline"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Register')}
                  </Button>
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    <button type="button" onClick={() => setIsLogin(!isLogin)} className="font-semibold text-blue-600 hover:underline pl-1">
                      {isLogin ? 'Register' : 'Sign In'}
                    </button>
                  </p>
                </CardFooter>
              </form>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;