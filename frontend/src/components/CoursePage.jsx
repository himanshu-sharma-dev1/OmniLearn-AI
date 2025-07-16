// src/components/CoursePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';
import { useToast } from '../hooks/use-toast';
import { FileText, Trash2, BrainCircuit, MessageSquare, ArrowLeft, Book } from 'lucide-react';
import QuizHistory from './QuizHistory';
import QuizModal from './QuizModal';
import AddSourceModal from './AddSourceModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
  
  const handleDeleteClick = (doc) => {
    setDocToDelete(doc);
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    try {
      await apiClient.delete(`/courses/${courseId}/documents/${docToDelete.id}`);
      toast({ title: "Success", description: `Document "${docToDelete.filename}" deleted.` });
      fetchCourse(); // Refresh course data
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast({ title: "Error", description: "Failed to delete document.", variant: "destructive" });
    } finally {
      setIsAlertOpen(false);
      setDocToDelete(null);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-muted-foreground">Loading course details...</div>;
  }

  if (!course) {
    return <div className="text-center py-10 text-destructive">Course not found.</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Button variant="link" onClick={() => navigate('/dashboard')} className="mb-6 p-0">
        <ArrowLeft size={18} className="mr-2" />
        Back to Dashboard
      </Button>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-4xl font-bold">{course.name}</CardTitle>
          <CardDescription className="text-lg pt-2">Manage your course materials and activities.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => navigate(`/chat/${course.id}`)} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
            <MessageSquare size={20} className="mr-2" />
            Start Chat
          </Button>
          <Button 
            onClick={handleGenerateQuiz}
            disabled={isGeneratingQuiz || course.documents.length === 0}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            <BrainCircuit size={20} className="mr-2" />
            {isGeneratingQuiz ? 'Generating...' : 'Generate Quiz'}
          </Button>
          <Button
            onClick={() => navigate(`/courses/${course.id}/study-guide`)}
            disabled={course.documents.length === 0}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            <Book size={20} className="mr-2" />
            Generate Study Guide
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle>Course Documents</CardTitle>
            <AddSourceModal courseId={courseId} onSourceAdded={fetchCourse} />
          </CardHeader>
          <CardContent>
            {course.documents && course.documents.length > 0 ? (
              <ul className="space-y-2">
                {course.documents.map(doc => (
                  <li key={doc.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center">
                      <FileText size={18} className="mr-3 text-muted-foreground" />
                      <span className="text-foreground">{doc.filename}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteClick(doc)}
                      aria-label={`Delete ${doc.filename}`}
                    >
                      <Trash2 size={18} className="text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No documents have been uploaded for this course yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quiz History</CardTitle>
          </CardHeader>
          <CardContent>
            <QuizHistory courseId={courseId} />
          </CardContent>
        </Card>
      </div>

      {isQuizModalOpen && quizData && (
        <QuizModal 
          quiz={quizData}
          courseId={course.id}
          courseName={course.name}
          onClose={() => setIsQuizModalOpen(false)}
        />
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              document "{docToDelete?.filename}" and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CoursePage;
