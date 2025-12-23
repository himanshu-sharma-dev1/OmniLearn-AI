import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient, { getErrorMessage } from '../apiClient';
import { X, BrainCircuit, BookOpen, Bookmark, FileText, Search, PlusCircle, Send, Sparkles, MessageSquare, Mic, Trash2, Download } from 'lucide-react';
import Notes from './Notes';
import VoiceInput from './VoiceInput';
import SourcesPanel from './SourcesPanel';
import SearchResults from './SearchResults';
import AIMessageContent from './AIMessageContent';
import { useToast } from '../hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { TypingIndicator } from './ui/typing-indicator';
import { GlassCard } from './ui/glass-card';
import { GradientButton } from './ui/gradient-button';

const ChatInterface = () => {
  const { courseId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [course, setCourse] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [highlightedSourceId, setHighlightedSourceId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const fetchCourseData = async () => {
    try {
      const response = await apiClient.get(`/courses/${courseId}`);
      setCourse(response.data);
      if (response.data && response.data.documents) {
        setSelectedDocs(response.data.documents.map(d => d.id));
      }
    } catch (error) {
      console.error("Failed to fetch course data:", error);
    }
  };

  // Load chat history from API
  const fetchChatHistory = async () => {
    try {
      const response = await apiClient.get(`/courses/${courseId}/chat-history`);
      if (response.data && response.data.messages) {
        const formattedMessages = response.data.messages.map((msg, index) => ({
          id: msg.id || index,
          text: msg.content,
          sender: msg.role === 'assistant' ? 'ai' : 'user',
          sources: msg.sources || []
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      // If no history endpoint or error, fall back to session storage
      console.log("Loading from session storage", error);
      const savedMessages = sessionStorage.getItem(`chatHistory_course_${courseId}`);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    }
  };

  // Clear chat history
  const handleClearChat = async () => {
    try {
      await apiClient.delete(`/courses/${courseId}/chat-history`);
      setMessages([]);
      sessionStorage.removeItem(`chatHistory_course_${courseId}`);
      toast({ title: "Success", description: "Chat history cleared." });
    } catch (error) {
      // If error, just clear locally
      setMessages([]);
      sessionStorage.removeItem(`chatHistory_course_${courseId}`);
    }
  };

  // Export chat as PDF
  const handleExportChat = async () => {
    if (messages.length === 0) {
      toast({ title: "No Messages", description: "Nothing to export.", variant: "destructive" });
      return;
    }

    try {
      const response = await apiClient.get(`/courses/${courseId}/chat/export/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `chat-${course?.name || 'export'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: "Downloaded", description: "Chat exported as PDF!" });
    } catch (err) {
      // Fallback to text export if PDF fails
      const textContent = messages.map(m =>
        `${m.sender === 'user' ? 'You' : 'AI'}: ${m.text}`
      ).join('\n\n---\n\n');
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${course?.name || 'export'}-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: "Chat exported as text (PDF unavailable)." });
    }
  };

  // Handle voice input transcript
  const handleVoiceTranscript = (transcript) => {
    setInput(prev => prev + transcript);
    inputRef.current?.focus();
  };

  useEffect(() => {
    fetchCourseData();
    fetchChatHistory();
  }, [courseId]);

  useEffect(() => {
    if (highlightedSourceId !== null) {
      setShowSources(true);
    }
  }, [highlightedSourceId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    if (messages.length > 0) {
      sessionStorage.setItem(`chatHistory_course_${courseId}`, JSON.stringify(messages));
    } else {
      sessionStorage.removeItem(`chatHistory_course_${courseId}`);
    }
  }, [messages, courseId]);

  const handleNewChat = () => {
    setMessages([]);
  };

  const handleSaveNote = async (content) => {
    const title = content.substring(0, 40) + "...";
    try {
      await apiClient.post('/notes', { title, content, course_id: courseId });
      toast({ title: "Success", description: "Note saved successfully!" });
    } catch (error) {
      console.error("Failed to save note:", error);
      toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const response = await apiClient.get(`/courses/${courseId}/search`, { params: { query: searchQuery } });
      setSearchResults(response.data);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const suggestedPrompts = [
    { icon: "📝", text: "Give me a brief summary of all the documents." },
    { icon: "📚", text: "Create a structured study guide from the materials." },
    { icon: "❓", text: "Generate potential FAQs from the documents." },
    { icon: "💡", text: "What are the main concepts covered?" }
  ];

  const handleSuggestedPrompt = (prompt) => {
    setInput(prompt);
    handleSend(prompt);
  };

  const handleSend = async (textToSend) => {
    const currentInput = typeof textToSend === 'string' ? textToSend : input;
    if (!currentInput.trim()) return;

    const userMessage = { id: Date.now(), text: currentInput, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create a placeholder for the AI message that will stream in
    const aiMessageId = Date.now() + 1;
    const placeholderMessage = { id: aiMessageId, text: '', sender: 'ai', sources: [], isStreaming: true };
    setMessages(prev => [...prev, placeholderMessage]);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      const response = await fetch(`${baseUrl}/courses/${courseId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          question: currentInput,
          document_ids: selectedDocs,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to chat');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let sources = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'chunk') {
                accumulatedText += data.content;
                setMessages(prev => prev.map(msg =>
                  msg.id === aiMessageId
                    ? { ...msg, text: accumulatedText }
                    : msg
                ));
              } else if (data.type === 'sources') {
                sources = data.sources;
                setMessages(prev => prev.map(msg =>
                  msg.id === aiMessageId
                    ? { ...msg, sources: sources }
                    : msg
                ));
              } else if (data.type === 'done') {
                setMessages(prev => prev.map(msg =>
                  msg.id === aiMessageId
                    ? { ...msg, isStreaming: false }
                    : msg
                ));
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (parseError) {
              // Ignore malformed JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({ title: "Error", description: "Failed to connect to the chat engine.", variant: "destructive" });
      // Update the placeholder with an error message
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId
          ? { ...msg, text: 'Sorry, something went wrong. Please try again.', isStreaming: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants
  const messageVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card/80 backdrop-blur-xl shadow-sm p-3 flex justify-between items-center z-10 border-b border-border/50"
      >
        <div className="flex items-center gap-1">
          <Button
            variant={showSources ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowSources(!showSources)}
            aria-label="Toggle sources"
            className="rounded-full"
          >
            <FileText size={20} />
          </Button>
          <Button
            variant={showNotes ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowNotes(!showNotes)}
            aria-label="Toggle notes"
            className="rounded-full"
          >
            <BookOpen size={20} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="hidden sm:block"
          >
            <Sparkles size={18} className="text-primary" />
          </motion.div>
          <h1 className="text-lg font-display font-bold truncate max-w-[200px] sm:max-w-none">
            {course?.name || 'Course Chat'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            aria-label="New Chat"
            className="rounded-full"
          >
            <PlusCircle size={20} />
          </Button>
          <form onSubmit={handleSearch} className="relative hidden sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search docs..."
              className="pl-9 pr-4 py-2 rounded-full h-9 w-40 focus:w-56 transition-all bg-muted/50"
            />
          </form>
        </div>
      </motion.header>

      {/* Main Chat Area */}
      <main className="flex-1 p-4 overflow-y-auto relative">
        <AnimatePresence>
          {showSources && (
            <SourcesPanel
              documents={course?.documents || []}
              selectedDocs={selectedDocs}
              setSelectedDocs={setSelectedDocs}
              highlightedSourceId={highlightedSourceId}
              onClose={() => { setShowSources(false); setHighlightedSourceId(null); }}
              courseId={courseId}
            />
          )}
          {showNotes && <Notes courseId={courseId} onClose={() => setShowNotes(false)} />}
          {showSearchResults && <SearchResults results={searchResults} isLoading={isSearching} onClose={() => setShowSearchResults(false)} />}
        </AnimatePresence>

        {!showSearchResults && messages.length === 0 && !isLoading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full"
          >
            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full">
                  <MessageSquare size={40} className="text-white" />
                </div>
              </div>
            </motion.div>

            <h2 className="text-2xl font-display font-bold mb-2">Start a Conversation!</h2>
            <p className="text-muted-foreground text-center mb-8 max-w-md">
              Ask me anything about your course materials, or try one of these suggestions:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
              {suggestedPrompts.map((prompt, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSuggestedPrompt(prompt.text)}
                  className="flex items-start gap-3 p-4 bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl text-left hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 group"
                >
                  <span className="text-2xl">{prompt.icon}</span>
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                    {prompt.text}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          !showSearchResults && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <AnimatePresence mode="popLayout">
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    variants={messageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.3, delay: index === messages.length - 1 ? 0.1 : 0 }}
                    className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'ai' && (
                      <motion.div
                        className="relative flex-shrink-0"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        <div className="absolute inset-0 bg-primary/30 rounded-full blur-md animate-pulse-slow" />
                        <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                          <BrainCircuit size={18} className="text-white" />
                        </div>
                      </motion.div>
                    )}
                    <div className={`relative group max-w-2xl rounded-2xl shadow-sm ${msg.sender === 'user'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-3'
                      : 'bg-card/90 backdrop-blur-sm border border-border/50 px-5 py-4 text-foreground'
                      }`}>
                      {/* Show typing indicator for empty streaming messages, otherwise show content */}
                      {msg.isStreaming && !msg.text ? (
                        <TypingIndicator />
                      ) : (
                        <AIMessageContent text={msg.text} sources={msg.sources} setHighlightedSourceId={setHighlightedSourceId} />
                      )}
                      {msg.sender === 'ai' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                          className="absolute -top-2 -right-2"
                        >
                          <Button
                            onClick={() => handleSaveNote(msg.text)}
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Save to notes"
                          >
                            <Bookmark size={14} />
                          </Button>
                        </motion.div>
                      )}
                    </div>
                    {msg.sender === 'user' && (
                      <motion.div
                        className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        <span className="text-white text-sm font-semibold">You</span>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator - only show when loading and no streaming message exists */}
              <AnimatePresence>
                {isLoading && !messages.some(m => m.isStreaming) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-start gap-3"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-primary/30 rounded-full blur-md animate-pulse" />
                      <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <BrainCircuit size={18} className="text-white" />
                      </div>
                    </div>
                    <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-2xl px-5 py-4">
                      <TypingIndicator />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          )
        )}
      </main>

      {/* Footer Input */}
      <motion.footer
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card/80 backdrop-blur-xl p-4 border-t border-border/50"
      >
        <div className="max-w-4xl mx-auto">
          {/* Action buttons row */}
          <div className="flex justify-end gap-2 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              className="text-muted-foreground hover:text-destructive"
              disabled={messages.length === 0}
            >
              <Trash2 size={14} className="mr-1" />
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportChat}
              className="text-muted-foreground hover:text-primary"
              disabled={messages.length === 0}
            >
              <Download size={14} className="mr-1" />
              Export
            </Button>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Voice Input */}
            <VoiceInput onTranscript={handleVoiceTranscript} />

            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                placeholder="Ask a question about the course..."
                className="pr-12 h-12 rounded-full bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20 text-base"
                disabled={isLoading}
              />
              <AnimatePresence>
                {input && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setInput('')}
                      className="h-8 w-8 rounded-full"
                      aria-label="Clear input"
                    >
                      <X size={16} />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <GradientButton
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="h-12 px-6 rounded-full"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    <Send size={18} />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </GradientButton>
            </motion.div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default ChatInterface;