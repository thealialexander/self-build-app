import React, { useState, useEffect } from 'react';
import { Check, X, Code, Eye } from 'lucide-react';
import * as Babel from '@babel/standalone';

const CodeApproval = ({ code, type, onApprove, onCancel }) => {
  const [view, setView] = useState('code'); // 'code' or 'preview'
  const [PreviewComponent, setPreviewComponent] = useState(null);

  useEffect(() => {
    if (type === 'frontend' && view === 'preview') {
      const inject = async () => {
        try {
          const transpiled = Babel.transform(code, {
            presets: ['react'],
            plugins: [
              ['transform-modules-commonjs', { strictMode: false }]
            ],
            filename: 'preview.jsx'
          }).code;

          const blob = new Blob([`
            const React = window.React;
            const Lucide = window.LucideIcons;
            const exports = {};
            const require = (name) => {
              if (name === 'react') return React;
              if (name === 'lucide-react') return Lucide;
              throw new Error('Module ' + name + ' not found');
            };
            ${transpiled}
            export default exports.default;
          `], { type: 'application/javascript' });

          const url = URL.createObjectURL(blob);
          const module = await import(/* @vite-ignore */ url);
          if (module.default) {
            setPreviewComponent(() => module.default);
          }
        } catch (err) {
          console.error('Preview failed:', err);
        }
      };
      inject();
    }
  }, [code, type, view]);

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 md:p-8 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-full border border-white/20">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Code size={18} className="text-blue-600" />
              <h3 className="font-bold">Approve {type === 'frontend' ? 'UI' : 'Logic'} Changes?</h3>
            </div>
            {type === 'frontend' && (
              <div className="flex bg-gray-200 rounded p-0.5 text-[10px] font-bold uppercase">
                <button
                  onClick={() => setView('code')}
                  className={`px-3 py-1 rounded ${view === 'code' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >Code</button>
                <button
                  onClick={() => setView('preview')}
                  className={`px-3 py-1 rounded ${view === 'preview' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >Preview</button>
              </div>
            )}
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-gray-900 relative">
          {view === 'code' ? (
            <div className="p-4">
               <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
                {code}
              </pre>
            </div>
          ) : (
            <div className="w-full h-full bg-white overflow-auto p-4">
               {PreviewComponent ? <PreviewComponent /> : <div className="text-gray-400 p-10 text-center">Loading Preview...</div>}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg hover:bg-white transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onApprove}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 text-sm"
          >
            <Check size={16} />
            Approve & Execute
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeApproval;
