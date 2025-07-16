import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CitationTooltip from './CitationTooltip';

const AIMessageContent = ({ text, sources, setHighlightedSourceId }) => {
  const [tooltip, setTooltip] = useState({
    isVisible: false,
    filename: '',
    targetRect: null,
  });
  const leaveTimeoutRef = useRef(null);

  const handleCitationClick = (e, source) => {
    e.preventDefault();
    if (source && source.id) {
      setHighlightedSourceId(source.id);
    }
  };

  const handleMouseEnter = (e, source) => {
    clearTimeout(leaveTimeoutRef.current); // Clear any pending hide actions
    const rect = e.target.getBoundingClientRect();
    setTooltip({
      isVisible: true,
      filename: source.filename,
      targetRect: rect,
    });
  };

  const handleMouseLeave = () => {
    // Set a timer to hide the tooltip, allowing for brief mouse-outs
    leaveTimeoutRef.current = setTimeout(() => {
      setTooltip({ isVisible: false, filename: '', targetRect: null });
    }, 300); // 300ms delay
  };

  const renderers = {
    p: ({ children }) => {
      return (
        <p className="inline">
          {React.Children.toArray(children).map((child, i) => {
            if (typeof child === 'string') {
              const parts = child.split(/(\[\d+\])/g);
              return parts.map((part, index) => {
                if (part.match(/\[\d+\]/)) {
                  const sourceNumber = parseInt(part.replace(/[\[\]]/g, ''), 10);
                  const source = sources && sources[sourceNumber - 1];
                  if (source) {
                    return (
                      <a
                        key={`${i}-${index}`}
                        href="#"
                        onClick={(e) => handleCitationClick(e, source)}
                        onMouseEnter={(e) => handleMouseEnter(e, source)}
                        onMouseLeave={handleMouseLeave}
                        className="text-blue-500 hover:underline mx-1 font-semibold"
                      >
                        [{sourceNumber}]
                      </a>
                    );
                  }
                }
                return <React.Fragment key={`${i}-${index}`}>{part}</React.Fragment>;
              });
            }
            return <React.Fragment key={i}>{child}</React.Fragment>;
          })}
        </p>
      );
    },
  };

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderers}>
        {text}
      </ReactMarkdown>
      <div
        onMouseEnter={() => clearTimeout(leaveTimeoutRef.current)}
        onMouseLeave={handleMouseLeave}
      >
        <CitationTooltip 
          filename={tooltip.filename} 
          targetRect={tooltip.targetRect} 
          isVisible={tooltip.isVisible}
        />
      </div>
    </>
  );
};

export default AIMessageContent;
