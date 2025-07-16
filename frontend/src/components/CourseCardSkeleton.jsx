import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';

const CourseCardSkeleton = () => {
  return (
    <Card className="flex flex-col animate-pulse h-full">
      <CardHeader>
        <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="h-10 bg-primary/30 rounded w-full mb-4"></div>
        <div className="h-5 bg-muted rounded w-2/3 mb-3"></div>
        <div className="h-4 bg-muted/50 rounded w-full mb-2"></div>
        <div className="h-4 bg-muted/50 rounded w-5/6"></div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4">
        <div className="w-full space-y-2">
          <div className="h-5 bg-muted rounded w-2/3 mb-3"></div>
          <div className="h-10 bg-green-600/30 rounded w-full mb-2"></div>
        </div>
        <div className="w-full grid grid-cols-2 gap-2">
          <div className="h-10 bg-purple-600/30 rounded w-full"></div>
          <div className="h-10 bg-muted/50 rounded w-full"></div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default CourseCardSkeleton;
