// src/components/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../apiClient';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Trash2, X, BookOpen, FileText, Search, Edit, Check, Upload, User, BrainCircuit, History } from 'lucide-react';
import EmptyState from './EmptyState';
import CourseCardSkeleton from './CourseCardSkeleton';
import { useToast } from '../hooks/use-toast';
import NotificationBell from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import QuizModal from './QuizModal';
import QuizHistory from './QuizHistory';

const DashboardPage = () => {
  const [courses, setCourses] = useState([]);
  const [newCourseName, setNewCourseName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState({});
  const [courseToRename, setCourseToRename] = useState(null);
  const [renamingCourseName, setRenamingCourseName] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [courseForQuiz, setCourseForQuiz] = useState(null);
  const [historyVisible, setHistoryVisible] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await apiClient.get('/courses');
        setCourses(response.data);
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast({ title: "Error", description: "Failed to fetch courses.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [toast]);

  const handleCreateCourse = async () => {
    if (!newCourseName.trim()) {
      toast({ title: "Error", description: "Course name cannot be empty.", variant: "destructive" });
      return;
    }
    try {
      const response = await apiClient.post('/courses', { name: newCourseName });
      const newCourse = { id: response.data.course_id, name: newCourseName, documents: [] };
      setCourses([...courses, newCourse]);
      setNewCourseName('');
      toast({ title: "Success", description: "Course created successfully." });
    } catch (error) {
      console.error('Error creating course:', error);
      toast({ title: "Error", description: "Failed to create course.", variant: "destructive" });
    }
  };

  const handleFileSelect = (event, courseId) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setSelectedFiles({ ...selectedFiles, [courseId]: files });
    }
  };

  const handleUploadDocument = async (e, courseId) => {
    e.stopPropagation();
    if (!selectedFiles[courseId] || selectedFiles[courseId].length === 0) {
      toast({ title: "Error", description: "Please select files to upload.", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFiles[courseId][0]); // Only take the first file
    formData.append('source_type', 'pdf');

    setIsUploading({ ...isUploading, [courseId]: true });

    try {
      await apiClient.post(`/courses/${courseId}/add-source`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast({ title: "Success", description: "Files uploaded successfully!" });
      setSelectedFiles({ ...selectedFiles, [courseId]: [] });
      const response = await apiClient.get('/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Error uploading files:', error);
      const errorMessage = error.response?.data?.msg || 'File upload failed.';
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUploading({ ...isUploading, [courseId]: false });
    }
  };

  const handleDeleteConfirm = async (e, courseId, courseName) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await apiClient.delete(`/courses/${courseId}`);
      setCourses(courses.filter(c => c.id !== courseId));
      toast({ title: "Success", description: `Course "${courseName}" deleted.` });
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({ title: "Error", description: "Failed to delete course.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenameConfirm = async (e, courseId) => {
    e.stopPropagation();
    if (!renamingCourseName.trim()) {
      toast({ title: "Error", description: "New course name cannot be empty.", variant: "destructive" });
      return;
    }
    try {
      const response = await apiClient.put(`/courses/${courseId}`, { name: renamingCourseName });
      setCourses(courses.map(c => c.id === courseId ? { ...c, name: response.data.name } : c));
      setCourseToRename(null);
      setRenamingCourseName('');
      toast({ title: "Success", description: `Course renamed to "${response.data.name}".` });
    } catch (error) {
      console.error('Error renaming course:', error);
      toast({ title: "Error", description: "Failed to rename course.", variant: "destructive" });
    }
  };

  const handleGenerateQuiz = async (e, course) => {
    e.stopPropagation();
    setIsGeneratingQuiz(true);
    setCourseForQuiz(course);
    try {
      const response = await apiClient.post(`/courses/${course.id}/generate-quiz`);
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

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">My Dashboard</h1>
          <div className="flex items-center space-x-2">
            <div className="relative w-full max-w-xs">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <NotificationBell />
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
              <User size={24} />
            </Button>
          </div>
        </header>

        <main>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create a New Course</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  id="create-course-input"
                  placeholder="Enter new course name"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateCourse()}
                />
                <Button onClick={handleCreateCourse}>Create Course</Button>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Your Courses</h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <CourseCardSkeleton key={i} />)}
              </div>
            ) : filteredCourses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No Courses Yet"
                description="It looks like you haven't created any courses. Start by adding your first course!"
                buttonText="Create Your First Course"
                onButtonClick={() => document.getElementById('create-course-input').focus()}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredCourses.map((course) => (
                    <motion.div
                      key={course.id}
                      layout
                      initial={{ opacity: 0, y: 50, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.9 }}
                      whileHover={{ scale: 1.03, y: -5 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <Card 
                        className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                        onClick={() => navigate(`/courses/${course.id}`)}
                      >
                        <CardHeader className="flex-row justify-between items-start">
                          <div>
                            {courseToRename?.id === course.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={renamingCourseName}
                                  onChange={(e) => setRenamingCourseName(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyPress={(e) => e.key === 'Enter' && handleRenameConfirm(e, course.id)}
                                  className="text-xl font-semibold"
                                />
                                <Button variant="ghost" size="icon" onClick={(e) => handleRenameConfirm(e, course.id)}><Check size={20} /></Button>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setCourseToRename(null); }}><X size={20} /></Button>
                              </div>
                            ) : (
                              <CardTitle>{course.name}</CardTitle>
                            )}
                            <CardDescription>Documents: {course.documents?.length || 0}</CardDescription>
                          </div>
                          <div className="flex items-center">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setCourseToRename(course); setRenamingCourseName(course.name); }}>
                              <Edit size={20} />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                  <Trash2 size={20} className="text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the course "{course.name}" and all associated data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={(e) => handleDeleteConfirm(e, course.id, course.name)} disabled={isDeleting}>
                                    {isDeleting ? 'Deleting...' : 'Continue'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          {course.documents && course.documents.length > 0 ? (
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {course.documents.slice(0, 3).map(doc => (
                                <li key={doc.id} className="flex items-center gap-2"><FileText size={14} />{doc.filename}</li>
                              ))}
                              {course.documents.length > 3 && <li>...and {course.documents.length - 3} more.</li>}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground flex items-center gap-2"><FileText size={14} />No documents yet.</p>
                          )}
                        </CardContent>
                        <CardFooter className="flex flex-col items-start gap-4">
                          <div className="w-full space-y-2">
                            <Label htmlFor={`file-upload-${course.id}`}>Upload Documents</Label>
                            <Input
                              id={`file-upload-${course.id}`}
                              type="file"
                              accept=".pdf"
                              // Removed 'multiple' attribute as backend expects single file
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleFileSelect(e, course.id)}
                            />
                            <Button 
                              onClick={(e) => handleUploadDocument(e, course.id)} 
                              disabled={!selectedFiles[course.id] || isUploading[course.id]} 
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                              {isUploading[course.id] ? 'Uploading...' : 'Upload'}
                            </Button>
                          </div>
                          <div className="w-full grid grid-cols-2 gap-2">
                            <Button 
                              onClick={(e) => handleGenerateQuiz(e, course)} 
                              disabled={isGeneratingQuiz && courseForQuiz?.id === course.id}
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <BrainCircuit size={16} className="mr-2" />
                              {isGeneratingQuiz && courseForQuiz?.id === course.id ? 'Generating...' : 'Generate Quiz'}
                            </Button>
                            <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setHistoryVisible(prev => (prev === course.id ? null : course.id)); }}>
                              <History size={16} className="mr-2" />
                              History
                            </Button>
                          </div>
                        </CardFooter>
                        {historyVisible === course.id && (
                          <div className="p-4 border-t">
                            <QuizHistory courseId={course.id} />
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </main>

        {isQuizModalOpen && quizData && (
          <QuizModal 
            quiz={quizData}
            courseId={courseForQuiz?.id}
            courseName={courseForQuiz?.name}
            onClose={() => setIsQuizModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;