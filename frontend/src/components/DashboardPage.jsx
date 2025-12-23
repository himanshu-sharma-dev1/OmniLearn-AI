import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  BookOpen,
  FileText,
  Trash2,
  Edit2,
  MessageSquare,
  ClipboardList,
  Youtube,
  Link as LinkIcon,
  Sparkles,
  Upload,
  History,
  X
} from 'lucide-react';
import apiClient from '../apiClient';
import { useToast } from '../hooks/use-toast';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { GlassCard } from './ui/glass-card';
import { AnimatedBackground } from './ui/animated-background';
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
import { Skeleton } from './ui/skeleton';
import NotificationBell from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';

// --- Document Type Icon ---
const getDocIcon = (type) => {
  if (type === 'youtube') return <Youtube size={14} className="text-red-500 shrink-0" />;
  if (type === 'url') return <LinkIcon size={14} className="text-blue-500 shrink-0" />;
  return <FileText size={14} className="text-slate-500 shrink-0" />;
};

// Card animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }),
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

// --- Course Card Component ---
const CourseCard = ({ course, navigate, onDelete, onRename, index }) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e) => {
    e.stopPropagation();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('source_type', 'pdf');
    formData.append('file', files[0]);

    try {
      await apiClient.post(`/courses/${course.id}/add-source`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast({ title: "Uploaded", description: "Document added!" });
      window.location.reload();
    } catch (err) {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCardClick = () => {
    navigate(`/courses/${course.id}`);
  };

  const stopProp = (e) => e.stopPropagation();

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={index}
      className="h-full cursor-pointer"
      onClick={handleCardClick}
    >
      <GlassCard className="h-full flex flex-col" hover={true}>
        {/* Header */}
        <div className="p-4 pb-3 border-b border-border/50">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate hover:text-primary transition-colors">
                {course.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Course ID: {course.id}
              </p>
            </div>
            <div className="flex items-center gap-1" onClick={stopProp}>
              <button
                onClick={() => onRename(course)}
                className="p-1.5 rounded-lg hover:bg-muted text-blue-500 transition-colors"
                title="Rename"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => onDelete(course)}
                className="p-1.5 rounded-lg hover:bg-muted text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Documents Section - Fixed Height */}
        <div className="p-4 pb-2">
          <h4 className="font-medium text-sm mb-2">Documents</h4>
          <div className="min-h-[72px]">
            {course.documents && course.documents.length > 0 ? (
              <ul className="space-y-1.5">
                {course.documents.slice(0, 3).map((doc, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-0.5">•</span>
                    <span className="truncate">{doc.filename}</span>
                  </li>
                ))}
                {course.documents.length > 3 && (
                  <li className="text-sm text-primary/70">+{course.documents.length - 3} more</li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText size={14} />
                No documents uploaded yet.
              </p>
            )}
          </div>
        </div>

        {/* Upload Section */}
        <div className="px-4 pb-4" onClick={stopProp}>
          <h4 className="font-medium text-sm mb-2">Upload Documents</h4>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf"
            className="block w-full text-xs text-muted-foreground mb-2
              file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 
              file:text-xs file:font-medium file:bg-muted file:text-foreground 
              hover:file:bg-muted/80 cursor-pointer"
          />
          <Button
            className="w-full h-9 bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={isUploading}
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            <Upload size={14} className="mr-1.5" />
            {isUploading ? 'Uploading...' : 'Upload PDFs'}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="p-4 pt-0 flex gap-2" onClick={stopProp}>
          <Button
            size="sm"
            className="flex-1 h-9 bg-purple-500 hover:bg-purple-600 text-white"
            onClick={() => navigate(`/courses/${course.id}`, { state: { openQuiz: true } })}
          >
            <ClipboardList size={14} className="mr-1.5" />
            Generate Quiz
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-9"
            onClick={() => navigate(`/courses/${course.id}`)}
          >
            <History size={14} className="mr-1.5" />
            View History
          </Button>
        </div>

        {/* Chat Button Full Width */}
        <div className="px-4 pb-4" onClick={stopProp}>
          <Button
            className="w-full h-10 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
            onClick={() => navigate(`/chat/${course.id}`)}
          >
            <MessageSquare size={16} className="mr-2" />
            Chat with AI
          </Button>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// --- Rename Modal ---
const RenameModal = ({ course, onClose, onRename }) => {
  const [name, setName] = useState(course?.name || '');
  const [loading, setLoading] = useState(false);

  if (!course) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onRename(course.id, name);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-background rounded-xl w-full max-w-md p-6 shadow-2xl border border-border"
      >
        <h2 className="text-lg font-semibold mb-4">Rename Course</h2>
        <form onSubmit={handleSubmit}>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-4"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- Main Dashboard ---
const DashboardPage = () => {
  const [courses, setCourses] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [courseToRename, setCourseToRename] = useState(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const getAvatarUrl = (path) => {
    if (!path) return null;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
    return `${baseUrl}/uploads/${path}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, profileRes] = await Promise.all([
          apiClient.get('/courses'),
          apiClient.get('/profile')
        ]);
        setCourses(coursesRes.data);
        setUser(profileRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    setIsCreating(true);
    try {
      const res = await apiClient.post('/courses', { name: newCourseName });
      toast({ title: "Success", description: "Course created!" });
      const courseId = res.data.course_id || res.data.id;
      setCourses([...courses, { id: courseId, name: newCourseName, documents: [] }]);
      setNewCourseName('');
      navigate(`/courses/${courseId}`);
    } catch (err) {
      toast({ title: "Error", description: "Failed to create course", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    try {
      await apiClient.delete(`/courses/${courseToDelete.id}`);
      setCourses(courses.filter(c => c.id !== courseToDelete.id));
      toast({ title: "Deleted", description: "Course removed" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setCourseToDelete(null);
    }
  };

  const handleRenameCourse = async (id, newName) => {
    try {
      await apiClient.put(`/courses/${id}`, { name: newName });
      setCourses(courses.map(c => c.id === id ? { ...c, name: newName } : c));
      toast({ title: "Renamed", description: "Course name updated" });
      setCourseToRename(null);
    } catch (err) {
      toast({ title: "Error", description: "Failed to rename", variant: "destructive" });
    }
  };

  const filteredCourses = courses.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userName = user ? (user.first_name || user.email?.split('@')[0] || 'User') : 'User';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ rotate: 15 }}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
                >
                  <Sparkles className="text-white" size={20} />
                </motion.div>
                <span className="font-display font-bold text-xl hidden sm:block">Intelli-Tutor</span>
              </div>

              {/* Search */}
              <div className="flex-1 max-w-md mx-4 hidden md:block">
                <motion.div
                  className="relative"
                  initial={false}
                  animate={{ scale: searchQuery ? 1.02 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Search courses..."
                    className="pl-9 pr-9 bg-muted/50 border-transparent focus:border-primary transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <AnimatePresence>
                    {searchQuery && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X size={14} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-2">
                <NotificationBell />
                <ThemeToggle />
                <Link to="/profile">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20 hover:ring-primary/50 transition-all cursor-pointer">
                    <AvatarImage src={getAvatarUrl(user?.avatar)} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm">
                      {userName[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-display font-bold">
              {getGreeting()}, {userName}!
            </h1>
            <p className="text-muted-foreground mt-2">
              {courses.length > 0
                ? `You have ${courses.length} course${courses.length !== 1 ? 's' : ''} in your library`
                : 'Start by creating your first course'}
            </p>
          </motion.div>

          {/* Create Course */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard className="mb-8">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
                  <h2 className="font-semibold">Create New Course</h2>
                </div>
                <form onSubmit={handleCreateCourse} className="flex gap-3">
                  <div className="flex-1 relative">
                    <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      placeholder="Enter course name..."
                      className="pl-10 h-11 bg-muted/50"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!newCourseName.trim() || isCreating}
                    className="h-11 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                </form>
              </div>
            </GlassCard>
          </motion.div>

          {/* Mobile Search */}
          <div className="md:hidden mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Search courses..."
                className="pl-9 h-11 bg-muted/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Search Results Info */}
          <AnimatePresence mode="wait">
            {searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Search size={14} />
                <span>
                  {filteredCourses.length} result{filteredCourses.length !== 1 ? 's' : ''} for "{searchQuery}"
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Courses Section Title */}
          {!loading && filteredCourses.length > 0 && !searchQuery && (
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg font-semibold mb-4 flex items-center gap-2"
            >
              <BookOpen size={20} className="text-primary" />
              Your Courses
            </motion.h2>
          )}

          {/* Course Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <GlassCard key={i}>
                  <div className="p-4 border-b border-border/50">
                    <Skeleton className="h-5 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <div className="p-4">
                    <Skeleton className="h-4 w-1/2 mb-3" />
                    <Skeleton className="h-3 w-full mb-1.5" />
                    <Skeleton className="h-3 w-2/3 mb-4" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-9 w-full mb-3" />
                  </div>
                  <div className="p-4 pt-0 flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                  </div>
                  <div className="px-4 pb-4">
                    <Skeleton className="h-10 w-full" />
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : filteredCourses.length > 0 ? (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              <AnimatePresence mode="popLayout">
                {filteredCourses.map((course, index) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    navigate={navigate}
                    onDelete={setCourseToDelete}
                    onRename={setCourseToRename}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center"
              >
                <BookOpen size={28} className="text-primary" />
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No courses found' : 'No courses yet'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Create your first course to get started'}
              </p>
            </motion.div>
          )}
        </main>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{courseToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this course and all its documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCourse} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {courseToRename && (
          <RenameModal
            course={courseToRename}
            onClose={() => setCourseToRename(null)}
            onRename={handleRenameCourse}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardPage;