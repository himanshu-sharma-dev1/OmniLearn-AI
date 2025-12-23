import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../apiClient';
import { useToast } from '../hooks/use-toast';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { AnimatedBackground } from './ui/animated-background';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Check,
    X,
    Sparkles,
    BookOpen,
    Loader2,
    Shuffle,
    Lightbulb,
    FileText,
    RefreshCw,
    Search,
    Trash2,
    Pencil,
    Volume2,
    VolumeX,
    MoreVertical,
    Download,
    Clock,
    Zap,
    Brain,
    Target,
    BarChart3,
} from 'lucide-react';

// Quantity presets like NotebookLM
const QUANTITY_PRESETS = [
    { label: 'Fewer', value: 5, description: '5 cards' },
    { label: 'Standard', value: 10, description: '10 cards' },
    { label: 'More', value: 20, description: '20 cards' },
];

// Difficulty levels
const DIFFICULTY_LEVELS = [
    { label: 'Easy', value: 'easy', description: 'Simple recall & definitions', color: 'bg-emerald-500' },
    { label: 'Medium', value: 'medium', description: 'Understanding & application', color: 'bg-amber-500' },
    { label: 'Hard', value: 'hard', description: 'Analysis & synthesis', color: 'bg-red-500' },
];

// Study modes
const STUDY_MODES = [
    { label: 'Due Cards', value: 'due', icon: Clock, description: 'Only cards due for review' },
    { label: 'Quick Review', value: 'quick', icon: Zap, description: '5-minute sprint session' },
    { label: 'Cram Mode', value: 'cram', icon: Brain, description: 'All cards, no schedule' },
    { label: 'Weak Areas', value: 'weak', icon: Target, description: 'Focus on difficult cards' },
];

// Text-to-Speech hook
const useTTS = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);

    const speak = useCallback((text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
        }
    }, []);

    const stop = useCallback(() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    return { speak, stop, isSpeaking };
};

// Flashcard flip component with delete/edit buttons
const FlipCard = ({ card, isFlipped, onFlip, onExplain, onEdit, onDelete, isExplaining, tts }) => (
    <div className="w-full aspect-[3/2] cursor-pointer perspective-1000 group" onClick={onFlip}>
        <motion.div
            className="relative w-full h-full"
            initial={false}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
            style={{ transformStyle: 'preserve-3d' }}
        >
            {/* Front */}
            <div
                className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 flex flex-col items-center justify-center text-white shadow-xl"
                style={{ backfaceVisibility: 'hidden' }}
            >
                {/* Card actions (top right) */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 bg-white/20 hover:bg-white/30 text-white"
                        onClick={(e) => { e.stopPropagation(); tts.speak(card.front); }}
                    >
                        {tts.isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 bg-white/20 hover:bg-white/30 text-white"
                        onClick={(e) => { e.stopPropagation(); onEdit(card); }}
                    >
                        <Pencil size={14} />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 bg-white/20 hover:bg-red-500/80 text-white"
                        onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
                    >
                        <Trash2 size={14} />
                    </Button>
                </div>

                <div className="text-center flex-1 flex items-center justify-center">
                    <p className="text-lg sm:text-xl font-medium">{card.front}</p>
                </div>
                <p className="text-xs text-white/70 mt-4">Tap to reveal answer</p>
            </div>

            {/* Back */}
            <div
                className="absolute inset-0 backface-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 flex flex-col text-white shadow-xl"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
                {/* Back actions */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 bg-white/20 hover:bg-white/30 text-white"
                        onClick={(e) => { e.stopPropagation(); tts.speak(card.back); }}
                    >
                        {tts.isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </Button>
                </div>

                <div className="flex-1 flex items-center justify-center">
                    <p className="text-lg sm:text-xl font-medium text-center">{card.back}</p>
                </div>

                {/* Source Citation */}
                {card.source && (
                    <div className="flex items-center justify-center gap-2 text-xs text-white/70 mt-2 border-t border-white/20 pt-3">
                        <FileText size={12} />
                        <span>{card.source}{card.page ? `, Page ${card.page}` : ''}</span>
                    </div>
                )}

                {/* Explain Button */}
                <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 bg-white/20 hover:bg-white/30 text-white border-0"
                    onClick={(e) => { e.stopPropagation(); onExplain && onExplain(card); }}
                    disabled={isExplaining}
                >
                    {isExplaining ? (
                        <Loader2 size={14} className="mr-1 animate-spin" />
                    ) : (
                        <Lightbulb size={14} className="mr-1" />
                    )}
                    Explain More
                </Button>
            </div>
        </motion.div>
    </div>
);

// Edit Card Modal
const EditCardModal = ({ card, onSave, onClose, isLoading }) => {
    const [front, setFront] = useState(card?.front || '');
    const [back, setBack] = useState(card?.back || '');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Pencil size={18} className="text-primary" />
                        Edit Flashcard
                    </h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X size={18} />
                    </Button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Question (Front)</label>
                        <Textarea
                            value={front}
                            onChange={(e) => setFront(e.target.value)}
                            placeholder="Enter the question..."
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Answer (Back)</label>
                        <Textarea
                            value={back}
                            onChange={(e) => setBack(e.target.value)}
                            placeholder="Enter the answer..."
                            rows={3}
                        />
                    </div>
                </div>

                <div className="flex gap-2 mt-6">
                    <Button variant="outline" className="flex-1" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500"
                        onClick={() => onSave({ front, back })}
                        disabled={isLoading || !front.trim() || !back.trim()}
                    >
                        {isLoading ? <Loader2 className="mr-2 animate-spin" size={16} /> : null}
                        Save Changes
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// Delete Confirmation Modal
const DeleteConfirmModal = ({ title, message, onConfirm, onClose, isLoading }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
    >
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Trash2 size={24} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm mb-6">{message}</p>
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="mr-2 animate-spin" size={16} /> : null}
                        Delete
                    </Button>
                </div>
            </div>
        </motion.div>
    </motion.div>
);

// Explanation Modal
const ExplanationModal = ({ explanation, card, onClose }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
    >
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Lightbulb size={16} className="text-amber-500" />
                            Deep Explanation
                        </div>
                        <h3 className="font-bold text-lg">{card.front}</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X size={18} />
                    </Button>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                        Quick Answer: {card.back}
                    </p>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{explanation}</p>
                </div>

                {card.source && (
                    <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText size={14} />
                        Source: {card.source}{card.page ? `, Page ${card.page}` : ''}
                    </div>
                )}
            </div>
        </motion.div>
    </motion.div>
);

// Study Stats Component
const StudyStats = ({ deck }) => {
    if (!deck) return null;

    const totalCards = deck.cards?.length || 0;
    const dueCards = deck.cards_due || 0;
    const reviewedToday = deck.cards?.filter(c => {
        if (!c.last_reviewed) return false;
        const today = new Date().toDateString();
        return new Date(c.last_reviewed).toDateString() === today;
    }).length || 0;

    return (
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-xl">
            <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalCards}</div>
                <div className="text-xs text-muted-foreground">Total Cards</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">{dueCards}</div>
                <div className="text-xs text-muted-foreground">Due Today</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-emerald-500">{reviewedToday}</div>
                <div className="text-xs text-muted-foreground">Reviewed</div>
            </div>
        </div>
    );
};

const FlashcardsPage = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const tts = useTTS();

    const [decks, setDecks] = useState([]);
    const [currentDeck, setCurrentDeck] = useState(null);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [course, setCourse] = useState(null);
    const [isShuffled, setIsShuffled] = useState(false);

    // Enhanced features state
    const [topic, setTopic] = useState('');
    const [quantityPreset, setQuantityPreset] = useState(1);
    const [difficultyLevel, setDifficultyLevel] = useState(1);
    const [showOptions, setShowOptions] = useState(false);
    const [explanation, setExplanation] = useState(null);
    const [isExplaining, setIsExplaining] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    // Edit/Delete state
    const [editingCard, setEditingCard] = useState(null);
    const [deleteCardId, setDeleteCardId] = useState(null);
    const [deleteDeckId, setDeleteDeckId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Study mode
    const [studyMode, setStudyMode] = useState('all');
    const [showStudyModes, setShowStudyModes] = useState(false);

    useEffect(() => {
        fetchData();
    }, [courseId]);

    const fetchData = async () => {
        try {
            const [courseRes, flashcardsRes] = await Promise.all([
                apiClient.get(`/courses/${courseId}`),
                apiClient.get(`/courses/${courseId}/flashcards`)
            ]);
            setCourse(courseRes.data);
            setDecks(flashcardsRes.data);
            if (flashcardsRes.data.length > 0) {
                setCurrentDeck(flashcardsRes.data[0]);
            }
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to load flashcards", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const generateFlashcards = async () => {
        setGenerating(true);
        setShowOptions(false);
        try {
            const count = QUANTITY_PRESETS[quantityPreset].value;
            const difficulty = DIFFICULTY_LEVELS[difficultyLevel].value;
            const res = await apiClient.post(`/courses/${courseId}/generate-flashcards`, {
                count,
                topic: topic || null,
                difficulty
            });
            toast({ title: "Success", description: `Generated ${res.data.count} flashcards!` });
            fetchData();
            setTopic('');
        } catch (err) {
            toast({ title: "Error", description: "Failed to generate flashcards", variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const handleExplain = async (card) => {
        setIsExplaining(true);
        try {
            const res = await apiClient.post('/flashcards/explain', {
                front: card.front,
                back: card.back,
                course_id: parseInt(courseId)
            });
            setExplanation({ text: res.data.explanation, card });
        } catch (err) {
            toast({ title: "Error", description: "Failed to get explanation", variant: "destructive" });
        } finally {
            setIsExplaining(false);
        }
    };

    const handleDeleteCard = async () => {
        if (!deleteCardId) return;
        setIsDeleting(true);
        try {
            await apiClient.delete(`/flashcards/${deleteCardId}`);
            toast({ title: "Success", description: "Card deleted" });
            // Update local state
            const updatedCards = currentDeck.cards.filter(c => c.id !== deleteCardId);
            if (updatedCards.length === 0) {
                // If no cards left, remove deck
                setDecks(decks.filter(d => d.id !== currentDeck.id));
                setCurrentDeck(decks.length > 1 ? decks.find(d => d.id !== currentDeck.id) : null);
            } else {
                setCurrentDeck({ ...currentDeck, cards: updatedCards });
                if (currentCardIndex >= updatedCards.length) {
                    setCurrentCardIndex(Math.max(0, updatedCards.length - 1));
                }
            }
            setDeleteCardId(null);
        } catch (err) {
            toast({ title: "Error", description: "Failed to delete card", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteDeck = async () => {
        if (!deleteDeckId) return;
        setIsDeleting(true);
        try {
            await apiClient.delete(`/flashcards/decks/${deleteDeckId}`);
            toast({ title: "Success", description: "Deck deleted" });
            const updatedDecks = decks.filter(d => d.id !== deleteDeckId);
            setDecks(updatedDecks);
            setCurrentDeck(updatedDecks.length > 0 ? updatedDecks[0] : null);
            setCurrentCardIndex(0);
            setDeleteDeckId(null);
        } catch (err) {
            toast({ title: "Error", description: "Failed to delete deck", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditCard = async (updates) => {
        if (!editingCard) return;
        setIsEditing(true);
        try {
            await apiClient.put(`/flashcards/${editingCard.id}`, updates);
            toast({ title: "Success", description: "Card updated" });
            // Update local state
            const updatedCards = currentDeck.cards.map(c =>
                c.id === editingCard.id ? { ...c, ...updates } : c
            );
            setCurrentDeck({ ...currentDeck, cards: updatedCards });
            setEditingCard(null);
        } catch (err) {
            toast({ title: "Error", description: "Failed to update card", variant: "destructive" });
        } finally {
            setIsEditing(false);
        }
    };

    const handleRegenerateCard = async () => {
        if (!currentDeck) return;
        setIsRegenerating(true);
        try {
            const existingCards = currentDeck.cards.map(c => ({ front: c.front, back: c.back }));
            const res = await apiClient.post('/flashcards/regenerate', {
                course_id: parseInt(courseId),
                existing_cards: existingCards,
                topic: topic || null
            });
            if (res.data.card) {
                const newCards = [...currentDeck.cards];
                newCards[currentCardIndex] = {
                    ...newCards[currentCardIndex],
                    front: res.data.card.front,
                    back: res.data.card.back,
                    source: res.data.card.source,
                    page: res.data.card.page
                };
                setCurrentDeck({ ...currentDeck, cards: newCards });
                setIsFlipped(false);
                toast({ title: "Success", description: "Card regenerated!" });
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to regenerate card", variant: "destructive" });
        } finally {
            setIsRegenerating(false);
        }
    };

    const reviewCard = async (quality) => {
        if (!currentDeck) return;
        const card = currentDeck.cards[currentCardIndex];
        try {
            await apiClient.post(`/flashcards/${card.id}/review`, { quality });
            if (currentCardIndex < currentDeck.cards.length - 1) {
                setCurrentCardIndex(prev => prev + 1);
                setIsFlipped(false);
            } else {
                toast({ title: "Deck Complete!", description: "You've reviewed all cards in this deck." });
                setCurrentCardIndex(0);
                setIsFlipped(false);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const nextCard = () => {
        if (currentDeck && currentCardIndex < currentDeck.cards.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
            setIsFlipped(false);
        }
    };

    const prevCard = () => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(prev => prev - 1);
            setIsFlipped(false);
        }
    };

    const shuffleCards = () => {
        if (!currentDeck) return;
        const shuffled = [...currentDeck.cards].sort(() => Math.random() - 0.5);
        setCurrentDeck({ ...currentDeck, cards: shuffled });
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setIsShuffled(true);
        toast({ title: "Shuffled!", description: "Cards have been randomized." });
    };

    const handleExportPDF = async () => {
        if (!currentDeck) return;
        try {
            const response = await apiClient.get(`/flashcards/decks/${currentDeck.id}/export/pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${currentDeck.name}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast({ title: "Downloaded", description: "PDF exported successfully" });
        } catch (err) {
            toast({ title: "Error", description: "Export not available yet", variant: "destructive" });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    const currentCard = currentDeck?.cards[currentCardIndex];

    return (
        <div className="min-h-screen relative">
            <AnimatedBackground />

            <div className="relative z-10">
                {/* Header */}
                <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-14">
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" size="icon" onClick={() => navigate(`/courses/${courseId}`)}>
                                    <ArrowLeft size={20} />
                                </Button>
                                <h1 className="text-lg font-semibold">Flashcards</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                {currentDeck && currentDeck.cards.length > 0 && (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleExportPDF}
                                        >
                                            <Download size={14} className="mr-1" />
                                            PDF
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleRegenerateCard}
                                            disabled={isRegenerating}
                                        >
                                            {isRegenerating ? (
                                                <Loader2 size={14} className="mr-1 animate-spin" />
                                            ) : (
                                                <RefreshCw size={14} className="mr-1" />
                                            )}
                                            Regenerate
                                        </Button>
                                        <Button
                                            variant={isShuffled ? "default" : "outline"}
                                            size="sm"
                                            onClick={shuffleCards}
                                            className={isShuffled ? "bg-amber-500 hover:bg-amber-600" : ""}
                                        >
                                            <Shuffle size={14} className="mr-1" />
                                            {isShuffled ? "Shuffled" : "Shuffle"}
                                        </Button>
                                    </>
                                )}
                                <Button
                                    onClick={() => setShowOptions(true)}
                                    disabled={generating}
                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="mr-2 animate-spin" size={16} />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2" size={16} />
                                            Generate New
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* No flashcards state */}
                    {decks.length === 0 || !currentDeck ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-16"
                        >
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                <BookOpen size={36} className="text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">No Flashcards Yet</h2>
                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                Generate flashcards from your course documents to start studying with spaced repetition.
                            </p>
                            <Button
                                onClick={() => setShowOptions(true)}
                                disabled={generating}
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                            >
                                {generating ? 'Generating...' : 'Generate Flashcards'}
                            </Button>
                        </motion.div>
                    ) : (
                        <div className="max-w-2xl mx-auto">
                            {/* Study Stats */}
                            <StudyStats deck={currentDeck} />

                            {/* Deck selector with delete option */}
                            {decks.length > 0 && (
                                <div className="mb-6 flex flex-wrap gap-2">
                                    {decks.map((deck) => (
                                        <div key={deck.id} className="relative group">
                                            <Button
                                                variant={currentDeck?.id === deck.id ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => {
                                                    setCurrentDeck(deck);
                                                    setCurrentCardIndex(0);
                                                    setIsFlipped(false);
                                                }}
                                                className="pr-8"
                                            >
                                                {deck.name}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-full w-8 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteDeckId(deck.id);
                                                }}
                                            >
                                                <Trash2 size={12} className="text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Progress */}
                            <div className="mb-4 text-center">
                                <span className="text-sm text-muted-foreground">
                                    Card {currentCardIndex + 1} of {currentDeck.cards.length}
                                </span>
                                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${((currentCardIndex + 1) / currentDeck.cards.length) * 100}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                            </div>

                            {/* Card */}
                            <AnimatePresence mode="wait">
                                {currentCard && (
                                    <motion.div
                                        key={currentCard.id || currentCardIndex}
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <FlipCard
                                            card={currentCard}
                                            isFlipped={isFlipped}
                                            onFlip={() => setIsFlipped(!isFlipped)}
                                            onExplain={handleExplain}
                                            onEdit={setEditingCard}
                                            onDelete={setDeleteCardId}
                                            isExplaining={isExplaining}
                                            tts={tts}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Controls */}
                            <div className="mt-8 flex items-center justify-center gap-4">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={prevCard}
                                    disabled={currentCardIndex === 0}
                                >
                                    <ChevronLeft size={20} />
                                </Button>

                                {isFlipped ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                                            onClick={() => reviewCard(1)}
                                        >
                                            <X size={16} className="mr-1" />
                                            Again
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                                            onClick={() => reviewCard(3)}
                                        >
                                            <RotateCcw size={16} className="mr-1" />
                                            Hard
                                        </Button>
                                        <Button
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                            onClick={() => reviewCard(5)}
                                        >
                                            <Check size={16} className="mr-1" />
                                            Easy
                                        </Button>
                                    </>
                                ) : (
                                    <Button onClick={() => setIsFlipped(true)}>
                                        Show Answer
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={nextCard}
                                    disabled={currentCardIndex === currentDeck.cards.length - 1}
                                >
                                    <ChevronRight size={20} />
                                </Button>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Generate Options Modal */}
            <AnimatePresence>
                {showOptions && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowOptions(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Sparkles className="text-primary" size={20} />
                                Generate Flashcards
                            </h3>

                            {/* Topic Focus */}
                            <div className="mb-4">
                                <label className="text-sm font-medium mb-2 block">Focus Topic (Optional)</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                    <Input
                                        placeholder="e.g., Machine Learning, Chapter 3..."
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Leave empty to cover all topics
                                </p>
                            </div>

                            {/* Difficulty Level */}
                            <div className="mb-4">
                                <label className="text-sm font-medium mb-2 block">Difficulty Level</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {DIFFICULTY_LEVELS.map((level, index) => (
                                        <button
                                            key={level.value}
                                            onClick={() => setDifficultyLevel(index)}
                                            className={`p-3 rounded-lg border-2 transition-all text-left ${difficultyLevel === index
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-primary/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-2 h-2 rounded-full ${level.color}`} />
                                                <span className="font-medium text-sm">{level.label}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">{level.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quantity Presets */}
                            <div className="mb-6">
                                <label className="text-sm font-medium mb-2 block">Number of Cards</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {QUANTITY_PRESETS.map((preset, index) => (
                                        <button
                                            key={preset.label}
                                            onClick={() => setQuantityPreset(index)}
                                            className={`p-3 rounded-lg border-2 transition-all ${quantityPreset === index
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-primary/50'
                                                }`}
                                        >
                                            <div className="font-medium">{preset.label}</div>
                                            <div className="text-xs text-muted-foreground">{preset.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setShowOptions(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500"
                                    onClick={generateFlashcards}
                                    disabled={generating}
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="mr-2 animate-spin" size={16} />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2" size={16} />
                                            Generate
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingCard && (
                    <EditCardModal
                        card={editingCard}
                        onSave={handleEditCard}
                        onClose={() => setEditingCard(null)}
                        isLoading={isEditing}
                    />
                )}
            </AnimatePresence>

            {/* Delete Card Modal */}
            <AnimatePresence>
                {deleteCardId && (
                    <DeleteConfirmModal
                        title="Delete Flashcard?"
                        message="This action cannot be undone. The card will be permanently removed."
                        onConfirm={handleDeleteCard}
                        onClose={() => setDeleteCardId(null)}
                        isLoading={isDeleting}
                    />
                )}
            </AnimatePresence>

            {/* Delete Deck Modal */}
            <AnimatePresence>
                {deleteDeckId && (
                    <DeleteConfirmModal
                        title="Delete Deck?"
                        message="This will delete the entire deck and all its flashcards. This cannot be undone."
                        onConfirm={handleDeleteDeck}
                        onClose={() => setDeleteDeckId(null)}
                        isLoading={isDeleting}
                    />
                )}
            </AnimatePresence>

            {/* Explanation Modal */}
            <AnimatePresence>
                {explanation && (
                    <ExplanationModal
                        explanation={explanation.text}
                        card={explanation.card}
                        onClose={() => setExplanation(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default FlashcardsPage;
