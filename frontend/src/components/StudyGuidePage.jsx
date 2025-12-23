import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BookOpen, Sparkles, Download, Copy, Check, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const StudyGuidePage = () => {
    const { courseId } = useParams();
    const [studyGuide, setStudyGuide] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const hasFetched = useRef(false);
    const { toast } = useToast();

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchStudyGuide = async () => {
            setIsLoading(true);
            setIsStreaming(true);
            setError(null);
            try {
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
                const response = await fetch(`${baseUrl}/courses/${courseId}/generate-study-guide`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.msg || 'Failed to start generation.');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    setStudyGuide(prev => prev + chunk);
                    setIsLoading(false);
                }

            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
                setIsStreaming(false);
            }
        };

        fetchStudyGuide();
    }, [courseId]);

    // Regenerate function - can be called manually
    const handleRegenerate = async () => {
        setStudyGuide('');
        setIsLoading(true);
        setIsStreaming(true);
        setError(null);

        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
            const response = await fetch(`${baseUrl}/courses/${courseId}/generate-study-guide`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.msg || 'Failed to start generation.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                setStudyGuide(prev => prev + chunk);
                setIsLoading(false);
            }
        } catch (err) {
            setError(err.message);
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(studyGuide);
        setCopied(true);
        toast({ title: "Copied!", description: "Study guide copied to clipboard." });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = async () => {
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
            const response = await fetch(`${baseUrl}/courses/${courseId}/study-guide/export/pdf`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: studyGuide })
            });

            if (!response.ok) throw new Error('PDF export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `study-guide-${courseId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast({ title: "Downloaded!", description: "Study guide saved as PDF." });
        } catch (err) {
            // Fallback to markdown
            const blob = new Blob([studyGuide], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `study-guide-${courseId}.md`;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: "Downloaded!", description: "Study guide saved as markdown (PDF unavailable)." });
        }
    };

    return (
        <div className="min-h-screen relative">
            <AnimatedBackground />

            <div className="container mx-auto p-4 md:p-6 relative z-10">
                {/* Back Button */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <Button asChild variant="ghost" className="mb-6 hover:bg-muted/50">
                        <Link to={`/courses/${courseId}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Course
                        </Link>
                    </Button>
                </motion.div>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-primary/20 mb-4">
                        <motion.div
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Sparkles size={18} className="text-primary" />
                        </motion.div>
                        <span className="text-sm font-medium text-primary">AI-Generated</span>
                    </div>
                    <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Study Guide
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Comprehensive review material generated from your course documents
                    </p>
                </motion.div>

                {/* Main Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <GlassCard hover={false} className="max-w-4xl mx-auto">
                        <CardHeader className="border-b border-border/50">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                                        <BookOpen size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="font-display">Study Guide Content</CardTitle>
                                        <CardDescription>
                                            {isStreaming ? 'Generating...' : isLoading ? 'Loading...' : 'Ready to study'}
                                        </CardDescription>
                                    </div>
                                </div>

                                {studyGuide && !isLoading && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleRegenerate}
                                            disabled={isStreaming}
                                            className="text-primary hover:text-primary"
                                        >
                                            <RefreshCw size={16} className={`mr-1 ${isStreaming ? 'animate-spin' : ''}`} />
                                            Regenerate
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={handleCopy}>
                                            {copied ? <Check size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
                                            {copied ? 'Copied!' : 'Copy'}
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={handleDownload}>
                                            <Download size={16} className="mr-1" />
                                            Download
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="pt-6">
                            {isLoading && !studyGuide && (
                                <div className="py-12">
                                    <LoadingSpinner size="lg" text="Generating your personalized study guide..." />
                                    <div className="mt-8 space-y-4 max-w-lg mx-auto">
                                        <Skeleton className="h-6 w-3/4" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-5/6" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-4/5" />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-12"
                                >
                                    <div className="text-6xl mb-4">😕</div>
                                    <h3 className="text-xl font-semibold text-destructive mb-2">
                                        Something went wrong
                                    </h3>
                                    <p className="text-muted-foreground">{error}</p>
                                    <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={() => window.location.reload()}
                                    >
                                        Try Again
                                    </Button>
                                </motion.div>
                            )}

                            {studyGuide && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="prose prose-slate dark:prose-invert max-w-none"
                                >
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {studyGuide}
                                    </ReactMarkdown>

                                    {isStreaming && (
                                        <motion.span
                                            animate={{ opacity: [1, 0, 1] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                            className="inline-block w-2 h-5 bg-primary ml-1 rounded-sm"
                                        />
                                    )}
                                </motion.div>
                            )}
                        </CardContent>
                    </GlassCard>
                </motion.div>
            </div>
        </div>
    );
};

export default StudyGuidePage;
