import React from 'react';
import { FileText } from 'lucide-react';

const CitationTooltip = ({ filename, snippet, isVisible, targetRect }) => {
  if (!targetRect) return null;

  // Position tooltip directly above the citation
  const tooltipWidth = 280;
  const tooltipHeight = snippet ? 110 : 40;

  // Calculate position to center above the citation
  let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
  let top = targetRect.top - tooltipHeight - 8; // 8px gap above citation

  // Keep within viewport bounds
  if (left < 10) left = 10;
  if (left + tooltipWidth > window.innerWidth - 10) {
    left = window.innerWidth - tooltipWidth - 10;
  }

  // If would appear above viewport, show below instead
  if (top < 10) {
    top = targetRect.bottom + 8;
  }

  const style = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    width: `${tooltipWidth}px`,
    zIndex: 9999,
    pointerEvents: isVisible ? 'auto' : 'none',
    opacity: isVisible ? 1 : 0,
    transform: `translateY(${isVisible ? '0' : '5px'})`,
    transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
  };

  return (
    <div
      style={style}
      className="bg-gray-900 text-white text-sm rounded-lg shadow-2xl border border-gray-700 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600/30 to-purple-600/30 border-b border-gray-700">
        <FileText size={14} className="text-blue-400 shrink-0" />
        <span className="font-medium text-xs truncate">{filename}</span>
      </div>

      {/* Content preview */}
      {snippet && (
        <div className="p-2 text-xs text-gray-300 leading-relaxed max-h-16 overflow-y-auto">
          <p className="italic line-clamp-3">"{snippet}"</p>
        </div>
      )}
    </div>
  );
};

export default CitationTooltip;
