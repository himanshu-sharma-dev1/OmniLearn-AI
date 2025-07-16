import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../apiClient';
import { X, BrainCircuit, BookOpen, Bookmark, FileText, Search, PlusCircle, Send } from 'lucide-react';
import Notes from './Notes';
import SourcesPanel from './SourcesPanel';
import SearchResults from './SearchResults';
import AIMessageContent from './AIMessageContent';
import { useToast } from '../hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';

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

  useEffect(() => {
    fetchCourseData();
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
    const savedMessages = sessionStorage.getItem(`chatHistory_course_${courseId}`);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, [courseId]);

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
    "Give me a brief summary of all the documents uploaded for this course.",
    "Create a structured study guide based on the key topics from the materials.",
    "Generate a list of potential Frequently Asked Questions (FAQs) from the provided documents.",
    "What are the main themes or concepts covered in this course?"
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

    try {
      const response = await apiClient.post(`/courses/${courseId}/chat`, { question: currentInput, document_ids: selectedDocs });
      const aiMessage = { id: Date.now() + 1, text: response.data.answer, sender: 'ai', sources: response.data.sources || [] };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({ title: "Error", description: "Failed to connect to the chat engine.", variant: "destructive" });
      const errorMessage = { id: Date.now() + 1, text: 'Sorry, something went wrong. Please try again.', sender: 'ai' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="bg-card shadow-md p-2 flex justify-between items-center z-10 border-b">
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" onClick={() => setShowSources(!showSources)} aria-label="Toggle sources">
            <FileText size={22} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowNotes(!showNotes)} aria-label="Toggle notes">
            <BookOpen size={22} />
          </Button>
        </div>
        <h1 className="text-xl font-bold">{course?.name || 'Course Chat'}</h1>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" onClick={handleNewChat} aria-label="New Chat">
            <PlusCircle size={22} />
          </Button>
          <form onSubmit={handleSearch} className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-10 pr-4 py-2 rounded-full h-9"
            />
          </form>
        </div>
      </header>
      
      <main className="flex-1 p-4 overflow-y-auto relative bg-slate-50 dark:bg-background">
        {showSources && <SourcesPanel documents={course?.documents || []} selectedDocs={selectedDocs} setSelectedDocs={setSelectedDocs} highlightedSourceId={highlightedSourceId} onClose={() => { setShowSources(false); setHighlightedSourceId(null); }} courseId={courseId} />}
        {showNotes && <Notes courseId={courseId} onClose={() => setShowNotes(false)} />}
        {showSearchResults && <SearchResults results={searchResults} isLoading={isSearching} onClose={() => setShowSearchResults(false)} />}

        {!showSearchResults && messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 dark:text-muted-foreground">
            <BookOpen size={48} className="text-gray-400 dark:text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2 text-gray-800 dark:text-foreground">Start a Conversation!</p>
            <p className="text-center mb-4">Ask me anything about your course materials, or try one of these suggestions:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="px-4 py-2 bg-white dark:bg-card border border-gray-300 dark:border-border rounded-md text-left text-gray-700 dark:text-foreground hover:bg-gray-50 dark:hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-ring transition-all duration-300"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          !showSearchResults && <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'ai' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-muted flex items-center justify-center">
                    <BrainCircuit size={20} />
                  </div>
                )}
                <div className={`relative group max-w-2xl px-4 py-2 rounded-lg shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-white dark:bg-muted border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-50'
                }`}>
                  <AIMessageContent text={msg.text} sources={msg.sources} setHighlightedSourceId={setHighlightedSourceId} />
                  {msg.sender === 'ai' && (
                    <Button 
                      onClick={() => handleSaveNote(msg.text)}
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Save to notes"
                    >
                      <Bookmark size={16} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <BrainCircuit size={20} />
                </div>
                <Card className="max-w-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-150"></div>
                  </div>
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      <footer className="bg-card p-4 border-t">
        <div className="flex items-center gap-2 relative">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder="Ask a question about the course..."
            className="flex-1 pr-10"
            disabled={isLoading}
          />
          {input && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setInput('')}
              className="absolute right-14 top-1/2 -translate-y-1/2 h-7 w-7"
              aria-label="Clear input"
            >
              <X size={16} />
            </Button>
          )}
          <Button onClick={() => handleSend()} disabled={isLoading}>
            <Send size={16} className="mr-2" />
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default ChatInterface;