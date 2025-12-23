// src/components/AuthCallback.tsx
// Handles OAuth callback - extracts token from URL and stores it

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (token) {
            // Store token and redirect to dashboard
            localStorage.setItem('token', token);
            navigate('/dashboard', { replace: true });
        } else if (error) {
            // Redirect back to login with error
            navigate(`/login?error=${error}`, { replace: true });
        } else {
            // No token or error, go to login
            navigate('/login', { replace: true });
        }
    }, [navigate, searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Completing sign in...</p>
            </div>
        </div>
    );
};

export default AuthCallback;
