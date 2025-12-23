import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../apiClient';
import { Trash2, X, FileText, Youtube, Link, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [filter, setFilter] = useState('');
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
    } catch (error) {
      console.error("Failed to delete document:", error);
    } finally {
      setIsAlertOpen(false);
      setDocToDelete(null);
      onClose();
    }
  };

  const getIcon = (type) => {
    if (type === 'youtube') return <Youtube size={16} className="text-red-500" />;
    if (type === 'url') return <Link size={16} className="text-blue-500" />;
    return <FileText size={16} className="text-orange-500" />;
  };

  const filteredDocs = documents.filter(d =>
    d.filename.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute top-0 right-0 h-full w-full md:w-96 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col"
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-lg font-display font-bold">Sources</h2>
            <p className="text-xs text-muted-foreground">{documents.length} materials available</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
            <X size={20} />
          </Button>
        </div>

        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Filter sources..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 h-9 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
              <input
                type="checkbox"
                checked={selectedDocs.length === documents.length && documents.length > 0}
                onChange={() => {
                  if (selectedDocs.length === documents.length) setSelectedDocs([]);
                  else setSelectedDocs(documents.map(d => d.id));
                }}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              Select All
            </label>
            <button
              onClick={() => setSelectedDocs([])}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              Clear selection
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-10 opacity-50">
              <FileText className="mx-auto h-10 w-10 mb-2" />
              <p className="text-sm">No documents found</p>
            </div>
          ) : (
            filteredDocs.map(doc => (
              <div
                key={doc.id}
                ref={el => documentRefs.current[doc.id] = el}
                className={`group flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${highlightedSourceId === doc.id
                    ? 'bg-primary/10 border-primary ring-1 ring-primary'
                    : selectedDocs.includes(doc.id)
                      ? 'bg-primary/5 border-primary/50'
                      : 'bg-white dark:bg-slate-950 border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:shadow-sm'
                  }`}
              >
                <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(doc.id)}
                    onChange={() => handleCheckboxChange(doc.id)}
                    className="rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 shrink-0">
                      {getIcon(doc.source_type)}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${selectedDocs.includes(doc.id) ? 'text-primary' : 'text-foreground'}`}>
                        {doc.filename}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {doc.source_type || 'PDF'}
                      </p>
                    </div>
                  </div>
                </label>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteClick(doc)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))
          )}
        </div>
      </motion.div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Source?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{docToDelete?.filename}"? The AI will no longer use this for answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SourcesPanel;
