// src/components/AddSourceModal.jsx
import React, { useState, useRef } from 'react';
import apiClient from '../apiClient';
import { useToast } from '../hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FileText, Link, Youtube, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const TabButton = ({ active, icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 w-full ${active
        ? 'border-primary bg-primary/5 text-primary'
        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-muted-foreground'
      }`}
  >
    <Icon size={24} className="mb-2" />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const AddSourceModal = ({ courseId, onSourceAdded }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pdf');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();

    if (activeTab === 'pdf' && file) {
      formData.append('source_type', 'pdf');
      formData.append('file', file);
    } else if (activeTab === 'url' && url) {
      formData.append('source_type', 'url');
      formData.append('url', url);
    } else if (activeTab === 'youtube' && url) {
      formData.append('source_type', 'youtube');
      formData.append('url', url);
    } else {
      toast({ title: "Missing Information", description: "Please provide a file or URL.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      await apiClient.post(`/courses/${courseId}/add-source`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast({ title: "Success", description: "Source added to course knowledge base." });
      onSourceAdded();
      setOpen(false);
      setFile(null);
      setUrl('');
    } catch (error) {
      console.error("Failed to add source:", error);
      toast({
        title: "Error",
        description: error.response?.data?.msg || "Failed to add source.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-dashed border-primary/50 text-primary hover:bg-primary/5">
          <UploadCloud className="mr-2 h-4 w-4" /> Add Source
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Add Learning Material</DialogTitle>
            <DialogDescription>
              Upload documents or link external resources for the AI to study.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <TabButton
              active={activeTab === 'pdf'}
              onClick={() => setActiveTab('pdf')}
              icon={FileText}
              label="PDF"
            />
            <TabButton
              active={activeTab === 'url'}
              onClick={() => setActiveTab('url')}
              icon={Link}
              label="Website"
            />
            <TabButton
              active={activeTab === 'youtube'}
              onClick={() => setActiveTab('youtube')}
              icon={Youtube}
              label="YouTube"
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-[120px]"
            >
              {activeTab === 'pdf' && (
                <div
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf"
                    ref={fileInputRef}
                    onChange={(e) => setFile(e.target.files[0])}
                    className="hidden"
                  />
                  <div className="bg-primary/10 p-3 rounded-full mb-3">
                    <UploadCloud className="text-primary h-6 w-6" />
                  </div>
                  <p className="font-medium text-sm">
                    {file ? file.name : "Click to select a PDF file"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">MAX 10MB</p>
                </div>
              )}

              {activeTab === 'url' && (
                <div className="space-y-3">
                  <Label htmlFor="url">Web Page URL</Label>
                  <Input
                    id="url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">The AI will read the text content of this page.</p>
                </div>
              )}

              {activeTab === 'youtube' && (
                <div className="space-y-3">
                  <Label htmlFor="yt-url">YouTube Video URL</Label>
                  <Input
                    id="yt-url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">We'll fetch the transcript from the video.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : 'Add Source'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddSourceModal;
