// src/components/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../apiClient';
import LoginIllustration from './LoginIllustration';
import { X, Sparkles } from 'lucide-react';

import { GradientButton } from '@/components/ui/gradient-button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '../hooks/use-toast';
import { AnimatedBackground } from '@/components/ui/animated-background';

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

  // Animation variants for staggered form fields
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className="min-h-screen relative flex justify-center items-center p-4 overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-0 max-w-5xl w-full bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50"
      >
        {/* Left Column: Illustration */}
        <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-12 text-white relative overflow-hidden">
          {/* Floating decorative elements */}
          <motion.div
            className="absolute top-10 right-10 w-20 h-20 rounded-full bg-white/10 blur-xl"
            animate={{ y: [-10, 10, -10], x: [-5, 5, -5] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 left-10 w-32 h-32 rounded-full bg-white/10 blur-xl"
            animate={{ y: [10, -10, 10], x: [5, -5, 5] }}
            transition={{ duration: 6, repeat: Infinity }}
          />

          <div className="w-full max-w-md text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-6"
                whileHover={{ scale: 1.05 }}
              >
                <Sparkles size={16} />
                <span className="text-sm font-medium">AI-Powered Learning</span>
              </motion.div>

              <h2 className="text-4xl font-display font-bold mb-4">
                Welcome to<br />Intelli-Tutor
              </h2>
              <p className="text-white/80 mb-8 text-lg">
                Your personal AI-powered learning companion that transforms documents into interactive knowledge.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="relative"
            >
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <LoginIllustration />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="flex justify-center items-center p-8 bg-card/50 backdrop-blur-sm">
          <motion.div
            key={isLogin ? 'login' : 'register'}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <Card className="border-none shadow-none bg-transparent">
              <CardHeader className="text-center pb-2">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <CardTitle className="text-3xl font-display font-bold text-foreground">
                    {isLogin ? 'Welcome Back!' : 'Create Account'}
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    {isLogin
                      ? 'Enter your credentials to access your dashboard'
                      : 'Start your learning journey today'}
                  </CardDescription>
                </motion.div>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <CardContent>
                  <motion.div
                    className="grid gap-5"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.div variants={itemVariants} className="grid gap-2 relative">
                      <Label htmlFor="email" className="text-base font-medium">Email</Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          placeholder="name@example.com"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-12 text-base transition-all duration-300 focus:ring-4 focus:ring-primary/20 bg-background/80"
                        />
                        {email && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            type="button"
                            onClick={() => setEmail('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Clear email"
                          >
                            <X size={18} />
                          </motion.button>
                        )}
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="grid gap-2 relative">
                      <Label htmlFor="password" className="text-base font-medium">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-12 text-base transition-all duration-300 focus:ring-4 focus:ring-primary/20 bg-background/80"
                        />
                        {password && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            type="button"
                            onClick={() => setPassword('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Clear password"
                          >
                            <X size={18} />
                          </motion.button>
                        )}
                      </div>
                      {isLogin && (
                        <div className="text-right mt-1">
                          <Link
                            to="/forgot-password"
                            className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors font-medium"
                          >
                            Forgot Password?
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                </CardContent>

                <CardFooter className="flex flex-col pt-2">
                  <motion.div
                    className="w-full"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.4 }}
                  >
                    <GradientButton
                      type="submit"
                      className="w-full h-12 text-base"
                      disabled={isLoading}
                      variant="primary"
                    >
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        isLogin ? 'Sign In' : 'Create Account'
                      )}
                    </GradientButton>
                  </motion.div>

                  {/* Divider */}
                  <motion.div
                    className="relative w-full my-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                  >
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-muted-foreground/30" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card/50 px-3 text-muted-foreground">Or continue with</span>
                    </div>
                  </motion.div>

                  {/* Google Sign-In */}
                  <motion.button
                    type="button"
                    onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/auth/google`}
                    className="w-full h-12 flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 shadow-sm transition-all duration-200 hover:shadow-md"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </motion.button>

                  <motion.p
                    className="mt-6 text-center text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.55 }}
                  >
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="font-semibold text-primary hover:text-primary/80 hover:underline pl-1 transition-colors"
                    >
                      {isLogin ? 'Register' : 'Sign In'}
                    </button>
                  </motion.p>
                </CardFooter>
              </form>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;