// src/components/CoursePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../apiClient';
import { useToast } from '../hooks/use-toast';
import { FileText, Trash2, BrainCircuit, MessageSquare, ArrowLeft, Book, Sparkles, Upload, Globe, Youtube, Settings2, Layers, Share2, BookOpen, PenTool, Copy, Check, Loader2, Network } from 'lucide-react';
import QuizHistory from './QuizHistory';
import QuizModal from './QuizModal';
import AddSourceModal from './AddSourceModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedBackground } from '@/components/ui/animated-background';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Loading skeleton for course page
const CoursePageSkeleton = () => (
  <div className="container mx-auto p-4 sm:p-6 lg:p-8">
    <Skeleton className="h-8 w-40 mb-6" />
    <Skeleton className="h-48 w-full rounded-2xl mb-8" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  </div>
);

// Document type icon mapper
const getDocIcon = (doc) => {
  if (doc.source_type === 'youtube') return <Youtube size={18} className="text-red-500" />;
  if (doc.source_type === 'url') return <Globe size={18} className="text-blue-500" />;
  return <FileText size={18} className="text-amber-500" />;
};

const getDocTypeIcon = (docType) => {
  switch (docType) {
    case 'pdf': return <FileText size={16} className="text-red-400" />;
    case 'url': return <Globe size={16} className="text-blue-400" />;
    case 'youtube': return <Youtube size={16} className="text-red-500" />;
    default: return <FileText size={16} className="text-muted-foreground" />;
  }
};

const CoursePage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  // Quiz options state
  const [showQuizOptions, setShowQuizOptions] = useState(false);
  const [quizDifficulty, setQuizDifficulty] = useState('medium');
  const [quizCount, setQuizCount] = useState(5);
  const [quizTypes, setQuizTypes] = useState(['mcq', 'true_false', 'fill_blank']);

  // Share feature state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [copied, setCopied] = useState(false);

  // Glossary feature state
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [glossary, setGlossary] = useState([]);
  const [isLoadingGlossary, setIsLoadingGlossary] = useState(false);
  const [isExtractingConcepts, setIsExtractingConcepts] = useState(false);

  // Essay grading state
  const [showEssayModal, setShowEssayModal] = useState(false);
  const [essayQuestion, setEssayQuestion] = useState('');
  const [essayAnswer, setEssayAnswer] = useState('');
  const [essayResult, setEssayResult] = useState(null);
  const [isGradingEssay, setIsGradingEssay] = useState(false);

  const fetchCourse = async () => {
    try {
      const response = await apiClient.get(`/courses/${courseId}`);
      setCourse(response.data);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast({ title: "Error", description: "Failed to fetch course details.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId, toast]);

  const handleGenerateQuiz = async () => {
    setIsGeneratingQuiz(true);
    setShowQuizOptions(false);
    try {
      const response = await apiClient.post(`/courses/${course.id}/generate-quiz`, {
        difficulty: quizDifficulty,
        count: quizCount,
        question_types: quizTypes
      });
      setQuizData(response.data.quiz);
      setIsQuizModalOpen(true);
    } catch (err) {
      console.error('Error generating quiz:', err);
      toast({
        title: "Error",
        description: err.response?.data?.error || 'Failed to generate quiz.',
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleDeleteClick = (doc) => {
    setDocToDelete(doc);
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    try {
      await apiClient.delete(`/courses/${courseId}/documents/${docToDelete.id}`);
      toast({ title: "Success", description: `Document "${docToDelete.filename}" deleted.` });
      fetchCourse();
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast({ title: "Error", description: "Failed to delete document.", variant: "destructive" });
    } finally {
      setIsAlertOpen(false);
      setDocToDelete(null);
    }
  };

  // Share feature handlers
  const handleCreateShareLink = async () => {
    setIsCreatingShare(true);
    try {
      const response = await apiClient.post(`/courses/${courseId}/share`, { permission: 'read' });
      const fullUrl = `${window.location.origin}/shared/${response.data.share_token}`;
      setShareLink(fullUrl);
    } catch (error) {
      console.error("Error creating share link:", error);
      toast({ title: "Error", description: "Failed to create share link", variant: "destructive" });
    } finally {
      setIsCreatingShare(false);
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Share link copied to clipboard" });
  };

  // Glossary feature handlers
  const handleLoadGlossary = async () => {
    setIsLoadingGlossary(true);
    try {
      const response = await apiClient.get(`/courses/${courseId}/glossary`);
      setGlossary(response.data);
    } catch (error) {
      console.error("Error loading glossary:", error);
    } finally {
      setIsLoadingGlossary(false);
    }
  };

  const handleExtractConcepts = async () => {
    setIsExtractingConcepts(true);
    try {
      const response = await apiClient.post(`/courses/${courseId}/extract-concepts`);
      setGlossary(response.data.concepts);
      toast({
        title: "Success!",
        description: `Extracted ${response.data.count} key concepts from your documents`
      });
    } catch (error) {
      console.error("Error extracting concepts:", error);
      toast({ title: "Error", description: "Failed to extract concepts", variant: "destructive" });
    } finally {
      setIsExtractingConcepts(false);
    }
  };

  // Essay grading handler
  const handleGradeEssay = async () => {
    if (!essayQuestion.trim() || !essayAnswer.trim()) {
      toast({ title: "Error", description: "Please enter both question and answer", variant: "destructive" });
      return;
    }
    setIsGradingEssay(true);
    setEssayResult(null);
    try {
      const response = await apiClient.post(`/courses/${courseId}/grade-essay`, {
        question: essayQuestion,
        answer: essayAnswer
      });
      setEssayResult(response.data);
    } catch (error) {
      console.error("Error grading essay:", error);
      toast({ title: "Error", description: "Failed to grade essay", variant: "destructive" });
    } finally {
      setIsGradingEssay(false);
    }
  };

  if (loading) {
    return <CoursePageSkeleton />;
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-display font-bold text-destructive mb-2">Course Not Found</h2>
          <p className="text-muted-foreground mb-4">The course you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} className="mr-2" />
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-6 hover:bg-muted/50"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Dashboard
          </Button>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 mb-8">
            {/* Decorative elements */}
            <motion.div
              className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div
              className="absolute -left-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-3xl"
              animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 5, repeat: Infinity, delay: 1 }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles size={24} className="text-white/80" />
                </motion.div>
                <span className="text-white/80 text-sm font-medium">AI-Powered Learning</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-display font-bold text-white mb-3">
                {course.name}
              </h1>

              <p className="text-white/80 text-lg mb-6">
                {course.documents?.length || 0} documents · Ready for AI tutoring
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => navigate(`/chat/${course.id}`)}
                    className="bg-white text-indigo-600 hover:bg-white/90 font-semibold h-11 px-6"
                  >
                    <MessageSquare size={18} className="mr-2" />
                    Start Chat
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => setShowQuizOptions(true)}
                    disabled={isGeneratingQuiz || course.documents?.length === 0}
                    variant="secondary"
                    className="bg-white/20 text-white hover:bg-white/30 border-white/30 font-semibold h-11 px-6"
                  >
                    <BrainCircuit size={18} className="mr-2" />
                    {isGeneratingQuiz ? 'Generating...' : 'Generate Quiz'}
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => navigate(`/courses/${course.id}/flashcards`)}
                    disabled={course.documents?.length === 0}
                    variant="secondary"
                    className="bg-white/20 text-white hover:bg-white/30 border-white/30 font-semibold h-11 px-6"
                  >
                    <Layers size={18} className="mr-2" />
                    Flashcards
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => navigate(`/courses/${course.id}/study-guide`)}
                    disabled={course.documents?.length === 0}
                    variant="secondary"
                    className="bg-white/20 text-white hover:bg-white/30 border-white/30 font-semibold h-11 px-6"
                  >
                    <Book size={18} className="mr-2" />
                    Study Guide
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => navigate(`/courses/${course.id}/mind-map`)}
                    disabled={course.documents?.length === 0}
                    variant="secondary"
                    className="bg-white/20 text-white hover:bg-white/30 border-white/30 font-semibold h-11 px-6"
                  >
                    <Network size={18} className="mr-2" />
                    Mind Map
                  </Button>
                </motion.div>

                {/* New Feature Buttons */}
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => { setShowGlossaryModal(true); handleLoadGlossary(); }}
                    disabled={course.documents?.length === 0}
                    variant="secondary"
                    className="bg-white/20 text-white hover:bg-white/30 border-white/30 font-semibold h-11 px-6"
                  >
                    <BookOpen size={18} className="mr-2" />
                    Glossary
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => setShowEssayModal(true)}
                    disabled={course.documents?.length === 0}
                    variant="secondary"
                    className="bg-white/20 text-white hover:bg-white/30 border-white/30 font-semibold h-11 px-6"
                  >
                    <PenTool size={18} className="mr-2" />
                    Essay Grading
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => { setShowShareModal(true); handleCreateShareLink(); }}
                    variant="secondary"
                    className="bg-white/20 text-white hover:bg-white/30 border-white/30 font-semibold h-11 px-6"
                  >
                    <Share2 size={18} className="mr-2" />
                    Share
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Documents Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard hover={false} className="h-full">
              <CardHeader className="flex-row justify-between items-center pb-4">
                <div>
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <FileText size={20} className="text-primary" />
                    Course Documents
                  </CardTitle>
                  <CardDescription>Your learning materials</CardDescription>
                </div>
                <AddSourceModal courseId={course.id} onSourceAdded={fetchCourse} />
              </CardHeader>
              <CardContent>
                {course.documents && course.documents.length > 0 ? (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                    {course.documents.map((doc) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getDocIcon(doc)}
                          <span className="text-sm font-medium truncate">{doc.filename}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                          onClick={() => handleDeleteClick(doc)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Upload size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">No documents uploaded yet.</p>
                    <AddSourceModal courseId={course.id} onSourceAdded={fetchCourse} />
                  </div>
                )}
              </CardContent>
            </GlassCard>
          </motion.div>

          {/* Quiz History Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard hover={false} className="h-full">
              <CardHeader>
                <CardTitle className="font-display text-xl flex items-center gap-2">
                  <BrainCircuit size={20} className="text-primary" />
                  Quiz History
                </CardTitle>
                <CardDescription>Track your learning progress</CardDescription>
              </CardHeader>
              <CardContent>
                <QuizHistory courseId={courseId} />
              </CardContent>
            </GlassCard>
          </motion.div>
        </div>
      </div>

      {/* Quiz Modal */}
      {isQuizModalOpen && quizData && (
        <QuizModal
          quiz={quizData}
          courseId={course.id}
          onClose={() => {
            setIsQuizModalOpen(false);
            setQuizData(null);
          }}
        />
      )}

      {/* Quiz Options Dialog */}
      <AlertDialog open={showQuizOptions} onOpenChange={setShowQuizOptions}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Settings2 size={20} />
              Quiz Settings
            </AlertDialogTitle>
            <AlertDialogDescription>
              Customize your quiz before generating.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-6 py-4">
            {/* Difficulty Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">Difficulty Level</label>
              <div className="grid grid-cols-3 gap-2">
                {['easy', 'medium', 'hard'].map((level) => (
                  <Button
                    key={level}
                    variant={quizDifficulty === level ? "default" : "outline"}
                    onClick={() => setQuizDifficulty(level)}
                    className="capitalize"
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            {/* Question Count Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">Number of Questions</label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((count) => (
                  <Button
                    key={count}
                    variant={quizCount === count ? "default" : "outline"}
                    onClick={() => setQuizCount(count)}
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>

            {/* Question Types Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">Question Types</label>
              <div className="space-y-2">
                {[
                  { id: 'mcq', label: 'Multiple Choice (MCQ)', icon: '🔘' },
                  { id: 'true_false', label: 'True / False', icon: '✓✗' },
                  { id: 'fill_blank', label: 'Fill in the Blank', icon: '___' }
                ].map(({ id, label, icon }) => (
                  <label
                    key={id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${quizTypes.includes(id)
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-primary/50'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={quizTypes.includes(id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setQuizTypes([...quizTypes, id]);
                        } else {
                          // Keep at least one type selected
                          if (quizTypes.length > 1) {
                            setQuizTypes(quizTypes.filter(t => t !== id));
                          }
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Select at least one question type.</p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <GradientButton onClick={handleGenerateQuiz} disabled={isGeneratingQuiz}>
              {isGeneratingQuiz ? 'Generating...' : 'Generate Quiz'}
            </GradientButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Document Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{docToDelete?.filename}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="text-primary" size={20} />
              Share Course
            </DialogTitle>
            <DialogDescription>
              Anyone with this link can view your course (read-only).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isCreatingShare ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : shareLink ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 p-2 text-sm border rounded-lg bg-muted"
                  />
                  <Button onClick={handleCopyShareLink} size="sm">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Generating share link...</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Glossary Modal */}
      <Dialog open={showGlossaryModal} onOpenChange={setShowGlossaryModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="text-primary" size={20} />
              Course Glossary
            </DialogTitle>
            <DialogDescription>
              Key concepts and definitions from your course materials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!glossary.length && !isLoadingGlossary && !isExtractingConcepts && (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">No glossary terms yet. Extract concepts from your documents.</p>
                <GradientButton onClick={handleExtractConcepts}>
                  <Sparkles size={16} className="mr-2" />
                  Extract Key Concepts
                </GradientButton>
              </div>
            )}

            {(isLoadingGlossary || isExtractingConcepts) && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">
                  {isExtractingConcepts ? 'Extracting concepts...' : 'Loading glossary...'}
                </span>
              </div>
            )}

            {glossary.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-muted-foreground">{glossary.length} terms</span>
                  <Button variant="outline" size="sm" onClick={handleExtractConcepts} disabled={isExtractingConcepts}>
                    <Sparkles size={14} className="mr-1" />
                    Refresh
                  </Button>
                </div>
                {glossary.map((term, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-muted/50 border">
                    <h4 className="font-semibold text-primary">{term.term}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{term.definition}</p>
                    {term.related_terms?.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {term.related_terms.map((rt, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">{rt}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Essay Grading Modal */}
      <Dialog open={showEssayModal} onOpenChange={setShowEssayModal}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="text-primary" size={20} />
              AI Essay Grading
            </DialogTitle>
            <DialogDescription>
              Get instant AI feedback on your essay answers based on course material.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Question</label>
              <textarea
                value={essayQuestion}
                onChange={(e) => setEssayQuestion(e.target.value)}
                placeholder="Enter the essay question..."
                rows={2}
                className="w-full p-3 border rounded-lg bg-background resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Your Answer</label>
              <textarea
                value={essayAnswer}
                onChange={(e) => setEssayAnswer(e.target.value)}
                placeholder="Write your essay response here..."
                rows={6}
                className="w-full p-3 border rounded-lg bg-background resize-none"
              />
            </div>

            <GradientButton onClick={handleGradeEssay} disabled={isGradingEssay} className="w-full">
              {isGradingEssay ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Grading...
                </>
              ) : (
                <>Grade My Essay</>
              )}
            </GradientButton>

            {essayResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 space-y-4"
              >
                <div className="text-center py-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-xl">
                  <div className="text-4xl font-bold text-primary">{essayResult.score}/100</div>
                  <div className="text-xl font-semibold mt-1">Grade: {essayResult.grade_letter}</div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-2">Feedback</h4>
                  <p className="text-sm text-muted-foreground">{essayResult.feedback}</p>
                </div>

                {essayResult.strengths?.length > 0 && (
                  <div className="p-4 rounded-lg bg-emerald-500/10">
                    <h4 className="font-semibold text-emerald-600 mb-2">Strengths</h4>
                    <ul className="list-disc ml-4 text-sm space-y-1">
                      {essayResult.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}

                {essayResult.improvements?.length > 0 && (
                  <div className="p-4 rounded-lg bg-amber-500/10">
                    <h4 className="font-semibold text-amber-600 mb-2">Areas for Improvement</h4>
                    <ul className="list-disc ml-4 text-sm space-y-1">
                      {essayResult.improvements.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoursePage;
