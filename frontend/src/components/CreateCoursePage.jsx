import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';

const CreateCoursePage = () => {
  const [courseName, setCourseName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseName.trim()) {
      toast({
        title: 'Error',
        description: 'Course name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/courses', { name: courseName });
      toast({
        title: 'Success!',
        description: `Course "${courseName}" has been created.`,
      });
      // Navigate to the newly created course page
      navigate(`/courses/${response.data.course_id}`);
    } catch (error) {
      console.error('Failed to create course:', error);
      toast({
        title: 'Failed to create course',
        description: error.response?.data?.msg || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Create a New Course</CardTitle>
              <CardDescription>
                Give your new course a name to begin. You can add documents and other materials after it's created.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="course-name" className="text-base font-medium">Course Name</Label>
                  <Input
                    id="course-name"
                    type="text"
                    placeholder="e.g., Introduction to Artificial Intelligence"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    disabled={isLoading}
                    required
                    className="text-base"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : 'Create Course'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateCoursePage;

