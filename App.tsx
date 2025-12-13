import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RefreshCw, Wand2, SkipBack, Info } from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import CanvasPlayer from './components/CanvasPlayer';
import { VideoContext, renderSceneAtTime, Scenes } from './services/engine';
import { generateScript } from './services/geminiService';
import { DEFAULT_SCRIPT, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import { TimelineData } from './types';

const App: React.FC = () => {
    // Editor State
    const [script, setScript] = useState(DEFAULT_SCRIPT);
    const [error, setError] = useState<string | null>(null);
    
    // Engine State
    const [timeline, setTimeline] = useState<TimelineData | null>(null);
    const [renderState, setRenderState] = useState({ objects: [] as any[] });
    
    // Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    
    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const requestRef = useRef<number | null>(null);
    const previousTimeRef = useRef<number | undefined>(undefined);

    // Compile Script
    const compile = useCallback(() => {
        try {
            setError(null);
            const context = new VideoContext();
            
            // Safe-ish execution
            // We create a Function that takes 'scene' and 'Scenes' as arguments
            const runScript = new Function('scene', 'Scenes', `"use strict";\n${script}`);
            
            runScript(context, Scenes);
            
            const data = context.getTimeline();
            setTimeline(data);
            setDuration(data.duration);
            setCurrentTime(0);
            setIsPlaying(false);
            
            // Initial render
            setRenderState({ objects: renderSceneAtTime(data, 0) });
            
        } catch (e: any) {
            console.error(e);
            setError(e.message);
        }
    }, [script]);

    // Initial Compile
    useEffect(() => {
        compile();
    }, []);

    // Animation Loop
    const animate = (time: number) => {
        if (previousTimeRef.current !== undefined) {
            const deltaTime = (time - previousTimeRef.current) / 1000;
            
            setCurrentTime(prev => {
                const next = prev + deltaTime;
                if (next >= duration) {
                    setIsPlaying(false);
                    return duration;
                }
                return next;
            });
        }
        previousTimeRef.current = time;
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        }
    };

    useEffect(() => {
        if (isPlaying) {
            previousTimeRef.current = undefined;
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, duration]);

    // Update Render State when time changes
    useEffect(() => {
        if (timeline) {
            setRenderState({ objects: renderSceneAtTime(timeline, currentTime) });
        }
    }, [currentTime, timeline]);

    const handleGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        const newCode = await generateScript(aiPrompt);
        setScript(newCode);
        setIsGenerating(false);
    };

    useEffect(() => {
        if (!isGenerating && script !== DEFAULT_SCRIPT) {
             compile();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGenerating]);


    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                         <Play className="w-4 h-4 text-white fill-current" />
                    </div>
                    <h1 className="font-bold text-xl tracking-tight">MotionScript</h1>
                </div>
                <div className="flex items-center gap-4">
                     <div className="flex items-center bg-gray-800 rounded-full px-4 py-1.5 border border-gray-700">
                        <Wand2 className="w-4 h-4 text-purple-400 mr-2" />
                        <input 
                            type="text" 
                            placeholder="Describe animation to generate..."
                            className="bg-transparent border-none focus:outline-none text-sm w-64 text-gray-200 placeholder-gray-500"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        />
                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded ml-2 transition-colors disabled:opacity-50"
                        >
                            {isGenerating ? 'Thinking...' : 'Generate'}
                        </button>
                     </div>
                    <button 
                        onClick={compile}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-medium transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Run Script</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {/* Editor Pane */}
                <div className="w-1/3 min-w-[400px] flex flex-col border-r border-gray-800">
                    <div className="px-4 py-2 bg-[#1e1e1e] border-b border-gray-800 flex justify-between items-center">
                        <span className="text-xs font-mono text-gray-500">main.ts</span>
                        <div className="flex gap-2">
                           <div title="Available: addCircle, addRect, moveTo, wait, playTogether...">
                                <Info className="w-4 h-4 text-gray-600 hover:text-gray-400 cursor-help" />
                           </div>
                        </div>
                    </div>
                    <CodeEditor value={script} onChange={setScript} error={error || undefined} />
                </div>

                {/* Preview Pane */}
                <div className="flex-1 bg-gray-950 flex flex-col">
                    <div className="flex-1 p-8 flex items-center justify-center relative bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
                         {/* Canvas Wrapper */}
                        <div className="w-full max-w-4xl shadow-2xl relative">
                             <CanvasPlayer width={CANVAS_WIDTH} height={CANVAS_HEIGHT} renderState={renderState} />
                        </div>
                    </div>

                    {/* Timeline Controls */}
                    <div className="h-24 bg-gray-900 border-t border-gray-800 px-6 flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => { setIsPlaying(false); setCurrentTime(0); }}
                                className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
                            >
                                <SkipBack className="w-5 h-5 fill-current" />
                            </button>
                            <button 
                                onClick={() => {
                                    if (currentTime >= duration) setCurrentTime(0);
                                    setIsPlaying(!isPlaying);
                                }}
                                className="p-3 bg-white hover:bg-gray-200 rounded-full text-black transition-transform active:scale-95"
                            >
                                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                            </button>
                        </div>
                        
                        <div className="flex-1 flex flex-col gap-2">
                             <div className="flex justify-between text-xs text-gray-500 font-mono">
                                <span>{currentTime.toFixed(2)}s</span>
                                <span>{duration.toFixed(2)}s</span>
                             </div>
                             <input 
                                type="range"
                                min={0}
                                max={duration || 1}
                                step={0.01}
                                value={currentTime}
                                onChange={(e) => {
                                    setIsPlaying(false);
                                    setCurrentTime(parseFloat(e.target.value));
                                }}
                                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                             />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;