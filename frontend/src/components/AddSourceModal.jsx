// src/components/AddSourceModal.jsx
import React, { useState, useRef } from 'react';
import apiClient from '../apiClient';
import { useToast } from '../hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AddSourceModal = ({ courseId, onSourceAdded }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pdf');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
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
      toast({ title: "No source provided", description: "Please select a file or enter a URL in the active tab.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      await apiClient.post(`/courses/${courseId}/add-source`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast({ title: "Success", description: "Source added successfully." });
      onSourceAdded(); // Callback to refresh the course page
      setOpen(false); // Close the modal
      // Reset state
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
        <Button>Add Source</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add a New Source</DialogTitle>
          <DialogDescription>
            Add a new source to your course. You can upload a PDF or add a website URL.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="pdf" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pdf">PDF</TabsTrigger>
            <TabsTrigger value="url">Website</TabsTrigger>
            <TabsTrigger value="youtube">YouTube</TabsTrigger>
          </TabsList>
          <TabsContent value="pdf">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="file-upload">Upload a PDF</Label>
                <Input id="file-upload" type="file" accept=".pdf" ref={fileInputRef} onChange={(e) => setFile(e.target.files[0])} />
                {file && <p className="text-sm text-muted-foreground mt-2">Selected: {file.name}</p>}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="url">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="url">Website URL</Label>
                <Input id="url" placeholder="https://example.com/article" value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="youtube">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="youtube-url">YouTube URL</Label>
                <Input id="youtube-url" placeholder="https://www.youtube.com/watch?v=..." value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Processing...' : 'Add to Course'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddSourceModal;
