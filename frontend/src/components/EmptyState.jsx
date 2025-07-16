import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

const EmptyState = ({ icon: Icon, title, description, buttonText, onButtonClick }) => {
  return (
    <Card className="flex flex-col items-center justify-center p-8 text-center">
      <CardContent className="flex flex-col items-center justify-center p-0">
        {Icon && <Icon className="w-16 h-16 text-muted-foreground mb-4" />}
        <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6">{description}</p>
        {buttonText && onButtonClick && (
          <Button onClick={onButtonClick}>
            {buttonText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EmptyState;
