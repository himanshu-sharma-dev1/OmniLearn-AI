// src/components/SharedCoursePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Globe, Youtube, ArrowLeft, User, Eye, Lock, MessageCircle, BookOpen, Send, Download, Copy, Check, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { useToast } from '@/hooks/use-toast';

const getDocTypeIcon = (docType) => {
    switch (docType) {
        case 'pdf': return <FileText size={16} className="text-red-400" />;
        case 'url': return <Globe size={16} className="text-blue-400" />;
        case 'youtube': return <Youtube size={16} className="text-red-500" />;
        default: return <FileText size={16} className="text-muted-foreground" />;
    }
};

const SharedCoursePage = () => {
    const { shareToken } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Chat state
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatEndRef = useRef(null);

    // Study guide state
    const [showStudyGuide, setShowStudyGuide] = useState(false);
    const [studyGuide, setStudyGuide] = useState('');
    const [isStudyGuideLoading, setIsStudyGuideLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

    useEffect(() => {
        const fetchSharedCourse = async () => {
            try {
                const response = await fetch(`${baseUrl}/shared/${shareToken}`);
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Failed to load shared course');
                }
                const data = await response.json();
                setData(data);
            } catch (err) {
                console.error('Error fetching shared course:', err);
                setError(err.message || 'Failed to load shared course');
            } finally {
                setLoading(false);
            }
        };

        fetchSharedCourse();
    }, [shareToken, baseUrl]);

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Send chat message
    const handleSendMessage = async () => {
        if (!chatInput.trim() || isChatLoading) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsChatLoading(true);

        try {
            const response = await fetch(`${baseUrl}/shared/${shareToken}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: userMessage, stream: true })
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiResponse = '';

            setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'chunk' && data.content) {
                                aiResponse += data.content;
                                setChatMessages(prev => {
                                    const newMessages = [...prev];
                                    newMessages[newMessages.length - 1].content = aiResponse;
                                    return newMessages;
                                });
                            } else if (data.type === 'error') {
                                throw new Error(data.message || 'Chat failed');
                            }
                            // type: 'done' and 'sources' are handled implicitly
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Chat error:', err);
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
            toast({ title: "Error", description: "Failed to get response", variant: "destructive" });
        } finally {
            setIsChatLoading(false);
        }
    };

    // Generate study guide
    const handleGenerateStudyGuide = async () => {
        setShowStudyGuide(true);
        setStudyGuide('');
        setIsStudyGuideLoading(true);

        try {
            const response = await fetch(`${baseUrl}/shared/${shareToken}/study-guide`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to generate study guide');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                setStudyGuide(prev => prev + chunk);
            }
        } catch (err) {
            console.error('Study guide error:', err);
            toast({ title: "Error", description: "Failed to generate study guide", variant: "destructive" });
        } finally {
            setIsStudyGuideLoading(false);
        }
    };

    // Copy study guide
    const handleCopyStudyGuide = () => {
        navigator.clipboard.writeText(studyGuide);
        setCopied(true);
        toast({ title: "Copied!", description: "Study guide copied to clipboard." });
        setTimeout(() => setCopied(false), 2000);
    };

    // Download study guide as PDF
    const handleDownloadStudyGuide = async () => {
        try {
            const response = await fetch(`${baseUrl}/shared/${shareToken}/study-guide/export/pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: studyGuide })
            });

            if (!response.ok) {
                // Fallback to markdown download
                const blob = new Blob([studyGuide], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `study-guide-${data?.course?.name || 'shared'}.md`;
                a.click();
                URL.revokeObjectURL(url);
                toast({ title: "Downloaded!", description: "Study guide saved as markdown." });
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `study-guide-${data?.course?.name || 'shared'}.pdf`);
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
            a.download = `study-guide-${data?.course?.name || 'shared'}.md`;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: "Downloaded!", description: "Study guide saved as markdown." });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading shared course...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md"
                >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Lock size={40} className="text-destructive" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-destructive mb-2">
                        Access Denied
                    </h2>
                    <p className="text-muted-foreground mb-6">
                        {error === 'Invalid or expired share link'
                            ? 'This share link is invalid or has expired.'
                            : error}
                    </p>
                    <Button onClick={() => navigate('/')} variant="outline">
                        <ArrowLeft size={18} className="mr-2" />
                        Go Home
                    </Button>
                </motion.div>
            </div>
        );
    }

    const { course, documents, permission, owner_name } = data;

    return (
        <div className="min-h-screen relative">
            <AnimatedBackground />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white"
            >
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <div className="flex items-center gap-2 text-white/80 text-sm mb-4">
                        <Eye size={14} />
                        <span>Shared Course</span>
                    </div>

                    <h1 className="text-4xl font-display font-bold mb-2">{course.name}</h1>

                    <div className="flex items-center gap-4 text-white/70">
                        <div className="flex items-center gap-2">
                            <User size={16} />
                            <span>Shared by {owner_name}</span>
                        </div>
                        <span>•</span>
                        <span>{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            </motion.div>

            {/* Action Buttons */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex flex-wrap gap-4">
                    <Button
                        onClick={() => setShowChat(true)}
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                    >
                        <MessageCircle size={18} className="mr-2" />
                        Chat with AI
                    </Button>
                    <Button
                        onClick={handleGenerateStudyGuide}
                        variant="outline"
                        disabled={isStudyGuideLoading}
                    >
                        <BookOpen size={18} className="mr-2" />
                        Generate Study Guide
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText size={20} />
                                Course Documents
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {documents.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                    No documents in this course yet.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {documents.map((doc) => (
                                        <motion.div
                                            key={doc.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                        >
                                            {getDocTypeIcon(doc.source_type)}
                                            <span className="font-medium">{doc.filename}</span>
                                            <span className="text-xs text-muted-foreground uppercase ml-auto">
                                                {doc.source_type}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* CTA */}
                    <div className="mt-8 text-center">
                        <Button onClick={() => navigate('/login')} size="lg">
                            Create Your Own Courses
                        </Button>
                    </div>
                </motion.div>
            </div>

            {/* Chat Modal */}
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowChat(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-background rounded-xl w-full max-w-2xl h-[600px] flex flex-col shadow-2xl"
                        >
                            {/* Chat Header */}
                            <div className="flex items-center justify-between p-4 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                                        <Sparkles size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Chat with AI</h3>
                                        <p className="text-xs text-muted-foreground">Ask questions about: {course.name}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
                                    <X size={20} />
                                </Button>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {chatMessages.length === 0 && (
                                    <div className="text-center text-muted-foreground py-12">
                                        <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>Ask anything about this course!</p>
                                        <p className="text-sm">Your messages won't be saved.</p>
                                    </div>
                                )}
                                {chatMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                            }`}>
                                            {msg.role === 'assistant' ? (
                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {msg.content || '...'}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <p>{msg.content}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Chat Input */}
                            <div className="p-4 border-t">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                        placeholder="Ask a question..."
                                        className="flex-1 px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                        disabled={isChatLoading}
                                    />
                                    <Button onClick={handleSendMessage} disabled={isChatLoading || !chatInput.trim()}>
                                        <Send size={18} />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Study Guide Modal */}
            <AnimatePresence>
                {showStudyGuide && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowStudyGuide(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-background rounded-xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl"
                        >
                            {/* Study Guide Header */}
                            <div className="flex items-center justify-between p-4 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                                        <BookOpen size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Study Guide</h3>
                                        <p className="text-xs text-muted-foreground">{course.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {studyGuide && !isStudyGuideLoading && (
                                        <>
                                            <Button variant="ghost" size="icon" onClick={handleCopyStudyGuide}>
                                                {copied ? <Check size={18} /> : <Copy size={18} />}
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={handleDownloadStudyGuide}>
                                                <Download size={18} />
                                            </Button>
                                        </>
                                    )}
                                    <Button variant="ghost" size="icon" onClick={() => setShowStudyGuide(false)}>
                                        <X size={20} />
                                    </Button>
                                </div>
                            </div>

                            {/* Study Guide Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {isStudyGuideLoading && !studyGuide && (
                                    <div className="text-center py-12">
                                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-muted-foreground">Generating study guide...</p>
                                    </div>
                                )}
                                {studyGuide && (
                                    <div className="prose prose-lg dark:prose-invert max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {studyGuide}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SharedCoursePage;
