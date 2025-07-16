import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../apiClient';
import { Trash2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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

const SourcesPanel = ({ documents, selectedDocs, setSelectedDocs, highlightedSourceId, onClose, courseId }) => {

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const documentRefs = useRef({});

  useEffect(() => {
    if (highlightedSourceId && documentRefs.current[highlightedSourceId]) {
      documentRefs.current[highlightedSourceId].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [highlightedSourceId]);

  const handleCheckboxChange = (docId) => {
    setSelectedDocs(prevSelected => 
      prevSelected.includes(docId)
        ? prevSelected.filter(id => id !== docId)
        : [...prevSelected, docId]
    );
  };

  const handleDeleteClick = (doc) => {
    setDocToDelete(doc);
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    try {
      await apiClient.delete(`/courses/${courseId}/documents/${docToDelete.id}`);
      // Instead of refetching, we'll rely on the parent to update the documents list
      // This might require a callback function if immediate update is needed.
      // For now, we assume parent will handle the refresh.
    } catch (error) {
      console.error("Failed to delete document:", error);
    } finally {
      setIsAlertOpen(false);
      setDocToDelete(null);
      onClose(); // Close panel to force parent refresh if necessary
    }
  };

  return (
    <>
      <Card className="absolute top-0 left-0 h-full w-full md:w-1/3 shadow-lg p-4 flex flex-col z-10 rounded-none md:rounded-lg bg-card text-card-foreground">
        <CardHeader className="flex-row justify-between items-center pb-4">
          <CardTitle className="text-2xl font-bold">Sources</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close sources">
            <X size={24} />
          </Button>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          {documents.length === 0 ? (
            <p className="text-muted-foreground">No documents have been uploaded for this course.</p>
          ) : (
            <div className="space-y-2 overflow-y-auto pr-2">
              <label className="flex items-center p-2 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDocs.length === documents.length && documents.length > 0}
                  onChange={() => {
                    if (selectedDocs.length === documents.length) {
                      setSelectedDocs([]);
                    } else {
                      setSelectedDocs(documents.map(d => d.id));
                    }
                  }}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-ring"
                />
                <span className="ml-3 font-semibold text-foreground">Select All</span>
              </label>
              <hr className="border-border"/>
              {documents.map(doc => (
                <div 
                  key={doc.id} 
                  ref={el => documentRefs.current[doc.id] = el}
                  className={`flex items-center justify-between p-2 rounded-md transition-colors duration-300 ${highlightedSourceId === doc.id ? 'bg-primary/20' : 'hover:bg-accent'}`}
                >
                  <label className="flex items-center cursor-pointer w-full">
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => handleCheckboxChange(doc.id)}
                      className="h-5 w-5 rounded border-border text-primary focus:ring-ring"
                    />
                    <span className="ml-3 text-foreground flex-grow">{doc.filename}</span>
                  </label>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteClick(doc)}
                    aria-label={`Delete ${doc.filename}`}
                    className="flex-shrink-0"
                  >
                    <Trash2 size={18} className="text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* ... AlertDialog ... */}
    </>
  );
};

export default SourcesPanel;
