import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const StudyGuidePage = () => {
    const { courseId } = useParams();
    const [studyGuide, setStudyGuide] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchStudyGuide = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`https://omnilearn-backend.fly.dev/courses/${courseId}/generate-study-guide`, {
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
                }

            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStudyGuide();
    }, [courseId]);

    return (
        <div className="container mx-auto p-4 md:p-6">
            <Button asChild variant="outline" className="mb-4">
                <Link to={`/courses/${courseId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Course
                </Link>
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>AI-Generated Study Guide</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading && <p className="text-muted-foreground">Your study guide is being generated. This may take a moment...</p>}
                    {error && <p className="text-destructive">Error: {error}</p>}
                    <div className="prose max-w-none text-foreground">
                        <ReactMarkdown>{studyGuide}</ReactMarkdown>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default StudyGuidePage;
