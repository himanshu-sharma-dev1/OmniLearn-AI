import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TitleUpdater = () => {
  const location = useLocation();

  useEffect(() => {
    const pathnames = {
      '/': 'Login',
      '/register': 'Register',
      '/dashboard': 'Dashboard',
      // Dynamic courseId handled below
    };

    let title = 'Intelli-Tutor'; // Default title

    if (location.pathname.startsWith('/course/')) {
      const courseId = location.pathname.split('/')[2];
      title = `Course: ${courseId} - Intelli-Tutor`;
    } else if (pathnames[location.pathname]) {
      title = `${pathnames[location.pathname]} - Intelli-Tutor`;
    }

    document.title = title;
  }, [location]);

  return null; // This component doesn't render anything visible
};

export default TitleUpdater;