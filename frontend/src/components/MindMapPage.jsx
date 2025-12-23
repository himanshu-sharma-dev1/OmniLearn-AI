import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType,
    Handle,
    Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../apiClient';
import { useToast } from '../hooks/use-toast';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { AnimatedBackground } from './ui/animated-background';
import {
    ArrowLeft,
    RefreshCw,
    Loader2,
    Network,
    Search,
    X,
} from 'lucide-react';

// Custom node styles based on type
const getNodeStyle = (type, isSelected) => {
    const baseStyles = {
        central: {
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: 'white',
            border: isSelected ? '3px solid #fbbf24' : 'none',
            borderRadius: '16px',
            padding: '20px 30px',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: isSelected
                ? '0 0 30px rgba(251, 191, 36, 0.6), 0 10px 40px rgba(99, 102, 241, 0.4)'
                : '0 10px 40px rgba(99, 102, 241, 0.4)',
            minWidth: '200px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        },
        main: {
            background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
            color: 'white',
            border: isSelected ? '3px solid #fbbf24' : 'none',
            borderRadius: '12px',
            padding: '14px 24px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: isSelected
                ? '0 0 20px rgba(251, 191, 36, 0.6), 0 6px 24px rgba(20, 184, 166, 0.3)'
                : '0 6px 24px rgba(20, 184, 166, 0.3)',
            minWidth: '140px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        },
        sub: {
            background: 'white',
            color: '#374151',
            border: isSelected ? '3px solid #fbbf24' : '2px solid #d1d5db',
            borderRadius: '10px',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: isSelected
                ? '0 0 15px rgba(251, 191, 36, 0.6), 0 4px 12px rgba(0, 0, 0, 0.08)'
                : '0 4px 12px rgba(0, 0, 0, 0.08)',
            minWidth: '120px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        },
    };
    return baseStyles[type] || baseStyles.sub;
};

// Handle style - invisible but functional
const handleStyle = {
    width: 8,
    height: 8,
    background: 'transparent',
    border: 'none',
};

// Custom node component with click handler AND connection handles
const CustomNode = ({ data, selected }) => (
    <div
        style={{ position: 'relative', ...getNodeStyle(data.type, selected) }}
        onClick={() => data.onClick && data.onClick(data)}
    >
        {/* Target handles - where edges come IN */}
        <Handle type="target" position={Position.Top} style={handleStyle} />
        <Handle type="target" position={Position.Left} style={handleStyle} id="left-target" />

        {data.label}

        {/* Source handles - where edges go OUT */}
        <Handle type="source" position={Position.Bottom} style={handleStyle} />
        <Handle type="source" position={Position.Right} style={handleStyle} id="right-source" />
    </div>
);

const nodeTypes = {
    custom: CustomNode,
};

// Tooltip component for node descriptions
const NodeTooltip = ({ node, onClose }) => {
    if (!node) return null;

    const getTooltipColor = (type) => {
        switch (type) {
            case 'central': return 'from-indigo-500 to-purple-600';
            case 'main': return 'from-teal-500 to-cyan-600';
            default: return 'from-gray-500 to-slate-600';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50"
        >
            <div className="bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl p-4 max-w-md">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white bg-gradient-to-r ${getTooltipColor(node.type)} mb-2`}>
                            {node.type === 'central' ? '🎯 Central Topic' : node.type === 'main' ? '📚 Main Concept' : '📌 Sub-topic'}
                        </div>
                        <h3 className="font-bold text-lg mb-1">{node.label}</h3>
                        <p className="text-sm text-muted-foreground">
                            {node.description || 'No description available for this concept.'}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={onClose}
                    >
                        <X size={14} />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

const MindMapPage = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(false);
    const [topic, setTopic] = useState('');
    const [centralTopic, setCentralTopic] = useState('');
    const [course, setCourse] = useState(null);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [selectedNode, setSelectedNode] = useState(null);

    useEffect(() => {
        fetchCourse();
    }, [courseId]);

    const fetchCourse = async () => {
        try {
            const response = await apiClient.get(`/courses/${courseId}`);
            setCourse(response.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleNodeClick = useCallback((nodeData) => {
        setSelectedNode({
            label: nodeData.label,
            type: nodeData.type,
            description: nodeData.description,
        });
    }, []);

    const generateMindMap = async () => {
        setLoading(true);
        setSelectedNode(null);
        try {
            const response = await apiClient.post(`/courses/${courseId}/mind-map`, {
                topic: topic || null,
            });

            const { nodes: rawNodes, edges: rawEdges, central_topic } = response.data;
            setCentralTopic(central_topic);

            // Position nodes in a radial layout
            const positionedNodes = calculateNodePositions(rawNodes);

            // Create reactflow nodes with click handler - ensure IDs are strings
            const flowNodes = positionedNodes.map((node) => ({
                id: String(node.id),
                type: 'custom',
                position: { x: node.x, y: node.y },
                data: {
                    label: node.label,
                    type: node.type,
                    description: node.description,
                    onClick: handleNodeClick,
                },
            }));

            // Get set of valid node IDs for edge validation
            const validNodeIds = new Set(flowNodes.map(n => n.id));

            // Create reactflow edges with ENHANCED styling - filter invalid edges
            const flowEdges = rawEdges
                .filter(edge => {
                    const sourceId = String(edge.source);
                    const targetId = String(edge.target);
                    const isValid = validNodeIds.has(sourceId) && validNodeIds.has(targetId);
                    if (!isValid) {
                        console.log(`Skipping invalid edge: ${sourceId} -> ${targetId}`);
                    }
                    return isValid;
                })
                .map((edge, index) => {
                    const sourceId = String(edge.source);
                    const targetId = String(edge.target);
                    const isFromCentral = sourceId === '1';
                    const targetNode = rawNodes.find(n => String(n.id) === targetId);
                    const isToMain = targetNode?.type === 'main';

                    return {
                        id: `edge-${index}`,
                        source: sourceId,
                        target: targetId,
                        label: edge.label,
                        type: 'smoothstep',
                        // Animate connections from central node
                        animated: isFromCentral,
                        style: {
                            stroke: isFromCentral ? '#6366f1' : isToMain ? '#14b8a6' : '#64748b',
                            strokeWidth: isFromCentral ? 4 : isToMain ? 3 : 2,
                        },
                        labelStyle: {
                            fontSize: 11,
                            fill: '#475569',
                            fontWeight: 500,
                            background: 'white',
                        },
                        labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
                        labelBgPadding: [4, 6],
                        labelBgBorderRadius: 4,
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            width: isFromCentral ? 20 : 15,
                            height: isFromCentral ? 20 : 15,
                            color: isFromCentral ? '#6366f1' : isToMain ? '#14b8a6' : '#64748b',
                        },
                    };
                });

            setNodes(flowNodes);
            setEdges(flowEdges);
            setHasGenerated(true);
            toast({ title: 'Success', description: 'Mind map generated! Click on any node to see details.' });
        } catch (err) {
            console.error(err);
            toast({
                title: 'Error',
                description: 'Failed to generate mind map',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    // Calculate radial positions for nodes
    const calculateNodePositions = (nodes) => {
        const centerX = 400;
        const centerY = 300;
        const mainRadius = 280;
        const subRadius = 160;

        const positioned = [];
        const centralNode = nodes.find((n) => n.type === 'central');
        const mainNodes = nodes.filter((n) => n.type === 'main');
        const subNodes = nodes.filter((n) => n.type === 'sub');

        // Position central node
        if (centralNode) {
            positioned.push({ ...centralNode, x: centerX, y: centerY });
        }

        // Position main nodes in a circle around center
        mainNodes.forEach((node, index) => {
            const angle = (2 * Math.PI * index) / mainNodes.length - Math.PI / 2;
            positioned.push({
                ...node,
                x: centerX + Math.cos(angle) * mainRadius,
                y: centerY + Math.sin(angle) * mainRadius,
            });
        });

        // Position sub nodes around their parent main nodes
        subNodes.forEach((subNode, index) => {
            const parentIndex = index % mainNodes.length;
            const parentAngle = (2 * Math.PI * parentIndex) / mainNodes.length - Math.PI / 2;
            const subAngle = parentAngle + ((index % 3) - 1) * 0.4;

            positioned.push({
                ...subNode,
                x: centerX + Math.cos(subAngle) * (mainRadius + subRadius),
                y: centerY + Math.sin(subAngle) * (mainRadius + subRadius),
            });
        });

        return positioned;
    };

    return (
        <div className="min-h-screen relative">
            <AnimatedBackground />

            <div className="relative z-10 h-screen flex flex-col">
                {/* Header */}
                <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border shrink-0">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-14">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => navigate(`/courses/${courseId}`)}
                                >
                                    <ArrowLeft size={20} />
                                </Button>
                                <div>
                                    <h1 className="text-lg font-semibold flex items-center gap-2">
                                        <Network size={20} className="text-primary" />
                                        Mind Map
                                    </h1>
                                    {course && (
                                        <p className="text-xs text-muted-foreground">{course.name}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                    <Input
                                        placeholder="Focus on topic (optional)..."
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        className="pl-9 w-48 h-9"
                                    />
                                </div>
                                <Button
                                    onClick={generateMindMap}
                                    disabled={loading}
                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 animate-spin" size={16} />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="mr-2" size={16} />
                                            {hasGenerated ? 'Regenerate' : 'Generate Map'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Mind Map Canvas */}
                <main className="flex-1 relative">
                    {!hasGenerated && !loading ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center h-full"
                        >
                            <div className="w-24 h-24 mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                <Network size={48} className="text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Create a Mind Map</h2>
                            <p className="text-muted-foreground mb-6 max-w-md text-center">
                                Visualize key concepts and their relationships from your course documents.
                                Optionally focus on a specific topic.
                            </p>
                            <Button
                                onClick={generateMindMap}
                                disabled={loading}
                                size="lg"
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                            >
                                <Network className="mr-2" size={20} />
                                Generate Mind Map
                            </Button>
                        </motion.div>
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader2 className="animate-spin mb-4" size={48} />
                            <p className="text-muted-foreground">Analyzing documents and building concept map...</p>
                        </div>
                    ) : (
                        <div className="h-full w-full">
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                nodeTypes={nodeTypes}
                                fitView
                                fitViewOptions={{ padding: 0.2 }}
                                minZoom={0.3}
                                maxZoom={2}
                                onPaneClick={() => setSelectedNode(null)}
                            >
                                <Controls />
                                <MiniMap
                                    nodeColor={(node) => {
                                        if (node.data.type === 'central') return '#6366f1';
                                        if (node.data.type === 'main') return '#14b8a6';
                                        return '#94a3b8';
                                    }}
                                    maskColor="rgba(0,0,0,0.1)"
                                />
                                <Background variant="dots" gap={20} size={1} color="#e2e8f0" />
                            </ReactFlow>

                            {/* Central topic badge */}
                            {centralTopic && (
                                <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-4 py-2 shadow-lg">
                                    <p className="text-xs text-muted-foreground">Central Topic</p>
                                    <p className="font-semibold text-primary">{centralTopic}</p>
                                </div>
                            )}

                            {/* Hint badge */}
                            {!selectedNode && hasGenerated && (
                                <div className="absolute top-4 right-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 shadow-lg">
                                    <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                        💡 Click on any node to see its description
                                    </p>
                                </div>
                            )}

                            {/* Node tooltip */}
                            <AnimatePresence>
                                {selectedNode && (
                                    <NodeTooltip
                                        node={selectedNode}
                                        onClose={() => setSelectedNode(null)}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default MindMapPage;
