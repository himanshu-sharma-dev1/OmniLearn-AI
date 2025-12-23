import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  User,
  PlusSquare,
  BookOpen,
  Search,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import { useTheme } from './use-theme';
import apiClient from '../apiClient';

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();

  // Toggle with Cmd+K
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Fetch courses when opened
  useEffect(() => {
    if (open) {
      const fetchCourses = async () => {
        try {
          const response = await apiClient.get('/courses');
          setCourses(response.data || []);
        } catch (error) {
          console.error('Failed to fetch courses:', error);
        }
      };
      fetchCourses();
    }
  }, [open]);

  const runCommand = (command) => {
    setOpen(false);
    command();
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-3" cmdk-input-wrapper="">
          <Search className="mr-2 h-5 w-5 shrink-0 opacity-50" />
          <Command.Input
            placeholder="Type a command or search..."
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            <CommandItem onSelect={() => runCommand(() => navigate('/dashboard'))} icon={Home}>
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate('/profile'))} icon={User}>
              Profile
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate('/create-course'))} icon={PlusSquare}>
              Create New Course
            </CommandItem>
          </Command.Group>

          {courses.length > 0 && (
            <Command.Group heading="Your Courses" className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
              {courses.map((course) => (
                <CommandItem
                  key={course.id}
                  value={course.name}
                  onSelect={() => runCommand(() => navigate(`/courses/${course.id}`))}
                  icon={BookOpen}
                >
                  {course.name}
                </CommandItem>
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Settings" className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
            <CommandItem onSelect={() => runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))} icon={theme === 'dark' ? Sun : Moon}>
              Toggle Theme
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => { localStorage.removeItem('token'); navigate('/login'); })} icon={LogOut}>
              Log out
            </CommandItem>
          </Command.Group>
        </Command.List>

        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2 text-[10px] text-muted-foreground flex justify-between">
          <span>Use arrows to navigate</span>
          <span className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono font-medium text-muted-foreground opacity-100">ESC</kbd>
            to close
          </span>
        </div>
      </div>
    </Command.Dialog>
  );
};

// Helper Item Component
const CommandItem = ({ children, onSelect, icon: Icon, value }) => (
  <Command.Item
    value={value || children}
    onSelect={onSelect}
    className="relative flex cursor-default select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
  >
    {Icon && <Icon className="mr-2 h-4 w-4" />}
    <span>{children}</span>
  </Command.Item>
);

export default CommandPalette;
