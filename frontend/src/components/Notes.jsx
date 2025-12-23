import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import NoteDetailModal from './NoteDetailModal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Search, X, FileEdit, Plus, Trash2, Calendar, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../hooks/use-toast';

const Notes = ({ courseId, onClose }) => {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchNotes = async () => {
    try {
      const response = await apiClient.get(`/courses/${courseId}/notes`);
      setNotes(response.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [courseId]);

  const handleNoteSave = () => {
    fetchNotes();
    setSelectedNote(null);
  };

  const handleNoteDelete = () => {
    fetchNotes();
    setSelectedNote(null);
  };

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      toast({ title: "Error", description: "Please provide both title and content", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.post('/notes', {
        title: newNoteTitle,
        content: newNoteContent,
        course_id: courseId
      });
      toast({ title: "Success", description: "Note created successfully!" });
      setNewNoteTitle('');
      setNewNoteContent('');
      setIsCreating(false);
      fetchNotes();
    } catch (error) {
      console.error("Failed to create note:", error);
      toast({ title: "Error", description: "Failed to create note", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      {/* Backdrop for mobile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />

      {/* Sidebar - Fixed/Sticky position */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 right-0 h-screen w-full md:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 shrink-0">
          <div>
            <h2 className="text-lg font-display font-bold flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-primary" />
              My Notes
            </h2>
            <p className="text-xs text-muted-foreground">{notes.length} notes saved</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
            <X size={20} />
          </Button>
        </div>

        {/* Tools */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white dark:bg-slate-950"
            />
          </div>
          <Button
            className="w-full justify-center"
            size="sm"
            onClick={() => setIsCreating(true)}
            disabled={isCreating}
          >
            <Plus className="h-4 w-4 mr-2" /> New Note
          </Button>
        </div>

        {/* Create Note Form */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-slate-200 dark:border-slate-800 overflow-hidden shrink-0"
            >
              <div className="p-4 space-y-3 bg-primary/5">
                <Input
                  placeholder="Note title..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="bg-white dark:bg-slate-950 font-medium"
                />
                <Textarea
                  placeholder="Write your note here... (supports Markdown)"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="bg-white dark:bg-slate-950 min-h-[100px] resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleCreateNote}
                    disabled={isSaving || !newNoteTitle.trim() || !newNoteContent.trim()}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Note
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCreating(false);
                      setNewNoteTitle('');
                      setNewNoteContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-60 text-center">
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-3">
                <FileEdit className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium">No notes found</p>
              <p className="text-xs text-muted-foreground mt-1 px-6">
                Click "New Note" to create your first note, or save interesting chat responses.
              </p>
            </div>
          ) : (
            filteredNotes.map(note => (
              <motion.div
                key={note.id}
                layoutId={`note-${note.id}`}
                onClick={() => setSelectedNote(note)}
                whileHover={{ scale: 1.02, y: -2 }}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                    {note.title || "Untitled Note"}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-3">
                  {note.content}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />
                    {formatDate(note.created_at)}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Detail Modal */}
      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onSave={handleNoteSave}
          onDelete={handleNoteDelete}
        />
      )}
    </>
  );
};

export default Notes;
