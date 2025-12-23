import React from 'react';
import { X, Loader2, AlertCircle, FileText, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';

const SearchResults = ({ results, isLoading, onClose }) => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const contentVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 10 }
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md">
            <div>
              <h2 className="text-lg font-display font-bold text-foreground">Search Results</h2>
              <p className="text-xs text-muted-foreground">Found {results.length} matches in knowledge base</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
              <X size={20} />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white dark:bg-slate-950">
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-48 text-muted-foreground">
                <Loader2 size={32} className="animate-spin mb-3 text-primary" />
                <p className="text-sm">Searching documents...</p>
              </div>
            ) : results.length > 0 ? (
              results.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors group"
                >
                  <p className="text-sm text-foreground leading-relaxed">
                    {result.content}
                  </p>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      <FileText size={12} />
                      <span className="truncate max-w-[150px]">{result.source}</span>
                    </div>
                    {result.page_number && (
                      <span className="text-xs text-muted-foreground bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        Page {result.page_number}
                      </span>
                    )}
                    <div className="flex-1" />
                    {/* Placeholder for 'Jump to section' if we implement it later */}
                    {/* <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Open <ExternalLink size={10} />
                     </Button> */}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col justify-center items-center h-48 text-muted-foreground">
                <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-full mb-3">
                  <AlertCircle size={32} className="text-slate-400" />
                </div>
                <p className="font-medium text-foreground">No matches found</p>
                <p className="text-sm mt-1">Try refining your query with different keywords.</p>
              </div>
            )}
          </div>

          {/* Footer (Optional, maybe specific actions) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[10px] text-muted-foreground">
              AI-powered search scans all your course documents for relevance.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SearchResults;