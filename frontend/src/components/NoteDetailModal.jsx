// src/components/NoteDetailModal.jsx
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Pen, Trash2, Save, X } from 'lucide-react';
import apiClient from '../apiClient';

const NoteDetailModal = ({ note, onClose, onSave, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(note.title);
  const [editedContent, setEditedContent] = useState(note.content);

  useEffect(() => {
    setEditedTitle(note.title);
    setEditedContent(note.content);
  }, [note]);

  const handleSave = async () => {
    try {
      await apiClient.put(`/notes/${note.id}`, {
        title: editedTitle,
        content: editedContent,
      });
      onSave(); // This will trigger a refresh in the parent
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      try {
        await apiClient.delete(`/notes/${note.id}`);
        onDelete(); // This will trigger a refresh and close the modal
      } catch (error) {
        console.error("Failed to delete note:", error);
      }
    }
  };

  // Stop propagation to prevent modal from closing when clicking inside
  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-800"
        onClick={handleModalContentClick}
      >
        {isEditing ? (
          <>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full p-2 border rounded mb-4 text-xl font-bold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-50"
            />
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full p-2 border rounded h-full flex-grow bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-50"
            />
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4">{note.title}</h2>
            <div className="prose dark:prose-invert max-w-none overflow-y-auto flex-grow">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
            </div>
          </>
        )}
        <div className="flex justify-end items-center space-x-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          {isEditing ? (
            <button onClick={handleSave} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              <Save size={16} className="mr-2" /> Save
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Pen size={16} className="mr-2" /> Edit
            </button>
          )}
          <button onClick={handleDelete} className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            <Trash2 size={16} className="mr-2" /> Delete
          </button>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700">
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteDetailModal;

