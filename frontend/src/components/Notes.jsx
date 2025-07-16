import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import NoteDetailModal from './NoteDetailModal';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X } from 'lucide-react';

const Notes = ({ courseId, onClose }) => {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);

  const fetchNotes = async () => {
    try {
      const response = await apiClient.get(`/courses/${courseId}/notes`);
      setNotes(response.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      console.error("Failed to fetch notes:", error);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      <Card className="absolute top-0 right-0 h-full w-full md:w-1/3 shadow-lg p-4 flex flex-col z-10 rounded-none md:rounded-lg">
        <CardHeader className="flex-row justify-between items-center pb-4">
          <CardTitle className="text-2xl font-bold">My Notes</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close notes">
            <X size={24} />
          </Button>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          {notes.length === 0 ? (
            <p className="text-muted-foreground">You haven't saved any notes for this course yet.</p>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-2">
              {notes.map(note => (
                <div 
                  key={note.id} 
                  className="p-4 border rounded-lg cursor-pointer bg-background hover:bg-accent text-foreground hover:text-accent-foreground transition-colors"
                  onClick={() => setSelectedNote(note)}
                >
                  <h3 className="font-bold truncate">{note.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {note.content.substring(0, 100)}...
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDate(note.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
