
import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  User, 
  PlusSquare, 
  BookOpen
} from 'lucide-react';

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open) {
      const fetchCourses = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
          const response = await fetch('/api/courses', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setCourses(data);
          }
        } catch (error) {
          console.error('Failed to fetch courses:', error);
        }
      };
      fetchCourses();
    }
  }, [open]);

  const runCommand = (command) => {
    command();
    setOpen(false);
  };

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={setOpen} 
      label="Global Command Menu"
    >
      <Command.Input placeholder="Type a command or search..." />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>

        <Command.Group heading="Navigation">
          <Command.Item onSelect={() => runCommand(() => navigate('/dashboard'))}>
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Command.Item>
          <Command.Item onSelect={() => runCommand(() => navigate('/profile'))}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Actions">
            <Command.Item onSelect={() => runCommand(() => navigate('/create-course'))}>
                <PlusSquare className="mr-2 h-4 w-4" />
                <span>Create New Course</span>
            </Command.Item>
        </Command.Group>

        {courses.length > 0 && (
            <Command.Group heading="Courses">
                {courses.map((course) => (
                    <Command.Item key={course.id} onSelect={() => runCommand(() => navigate(`/courses/${course.id}`))}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>{course.name}</span>
                    </Command.Item>
                ))}
            </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
};

export default CommandPalette;
