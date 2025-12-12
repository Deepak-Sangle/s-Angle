import React from 'react';

interface CodeEditorProps {
    value: string;
    onChange: (val: string) => void;
    error?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, error }) => {
    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] border-r border-gray-700">
            <div className="flex-1 relative overflow-hidden">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-full p-4 bg-transparent text-gray-200 code-font text-sm resize-none focus:outline-none leading-6"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                />
                {error && (
                    <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 text-red-200 p-2 rounded text-xs border border-red-700">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodeEditor;
