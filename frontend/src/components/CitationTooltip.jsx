import React from 'react';

const CitationTooltip = ({ filename, isVisible, targetRect }) => {
  
  const style = {
    position: 'fixed',
    top: targetRect ? targetRect.top - 35 : 0, // Increased offset above the citation
    left: targetRect ? targetRect.left + (targetRect.width / 2) : 0, // Centered horizontally
    transform: 'translateX(-50%)', // Further center it
    zIndex: 9999, // Very high z-index to ensure visibility
    pointerEvents: 'none', // Allows clicks to pass through to the underlying element
    opacity: isVisible ? 1 : 0, // Control visibility with opacity
    transition: 'opacity 0.1s ease-in-out', // Smooth transition
  };

  

  return (
    <div
      style={style}
      className="bg-gray-800 text-white text-xs rounded py-1 px-2 shadow-lg whitespace-nowrap"
    >
      {filename}
    </div>
  );
};

export default CitationTooltip;
