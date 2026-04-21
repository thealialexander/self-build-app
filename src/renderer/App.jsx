import React, { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import BackendInterface from './components/BackendInterface';
import * as Babel from '@babel/standalone';

function App() {
  const [showBackend, setShowBackend] = useState(false);
  const [isDetachedMode, setIsDetachedMode] = useState(false);
  const [Component, setComponent] = useState(null);

  useEffect(() => {
    if (window.location.hash === '#/detached') {
      setIsDetachedMode(true);
      return;
    }

    const loadSavedCode = async () => {
      const code = await window.electronAPI.getSavedCode('frontend');
      if (code) {
        injectCode(code);
      }
    };

    const injectCode = async (code) => {
      if (!code) return;
      try {
        console.log('Injecting code length:', code.length);

        // Transpile JSX/Modern JS to vanilla JS
        const transpiled = Babel.transform(code, {
          presets: ['react'],
          filename: 'dynamic-component.jsx'
        }).code;

        // Strip imports and transform to a self-contained function
        // We use 'eval' with a wrapper to handle the exports
        const wrappedCode = `
          (function() {
            const exports = {};
            const React = window.React;
            const { ${Object.keys(await import('lucide-react')).join(', ')} } = window.LucideIcons;

            ${transpiled.replace(/import\s+.*?\s+from\s+['"].*?['"];?/g, '')}

            return exports.default || typeof App !== 'undefined' ? App : null;
          })()
        `;

        // Actually, a better way for Babel is to use the 'umd' or similar if possible,
        // but we can just use the fact that we've exposed React globally.
        // Let's refine the transpilation to not use ESM imports.

        const finalCode = Babel.transform(code, {
          presets: ['react'],
          plugins: [
            ['transform-modules-commonjs', { strictMode: false }]
          ],
          filename: 'dynamic-component.jsx'
        }).code;

        // Custom require to handle lucide-react and react
        const blob = new Blob([`
          const React = window.React;
          const Lucide = window.LucideIcons;
          const exports = {};
          const require = (name) => {
            if (name === 'react') return React;
            if (name === 'lucide-react') return Lucide;
            throw new Error('Module ' + name + ' not found');
          };
          ${finalCode}
          export default exports.default;
        `], { type: 'application/javascript' });

        const url = URL.createObjectURL(blob);
        const module = await import(/* @vite-ignore */ url);

        if (module.default) {
           setComponent(() => module.default);
        }
      } catch (err) {
        console.error('Failed to inject code:', err);
        // Try to show error on screen if possible
        setComponent(() => () => (
          <div className="p-10 bg-red-50 text-red-800 border border-red-200 rounded-xl max-w-lg">
            <h1 className="font-bold mb-2">Injection Error</h1>
            <pre className="text-xs whitespace-pre-wrap">{err.stack || err.message}</pre>
          </div>
        ));
      }
    };

    loadSavedCode();

    const handleUpdate = (e) => {
      console.log('Frontend update event received');
      injectCode(e.detail);
    };

    window.addEventListener('frontend-code-updated', handleUpdate);
    return () => window.removeEventListener('frontend-code-updated', handleUpdate);
  }, []);

  if (isDetachedMode) {
    return <BackendInterface isDetached={true} />;
  }

  return (
    <div className="h-screen w-screen bg-white overflow-hidden flex flex-col">
      <TitleBar
        onToggleBackend={() => setShowBackend(!showBackend)}
        isActive={showBackend}
      />
      <div className="flex-1 relative overflow-hidden">
        {/* Initially blank slate or dynamic component */}
        <div className="w-full h-full flex items-center justify-center overflow-auto bg-white">
          {Component ? (
            <div className="w-full h-full">
              <Component />
            </div>
          ) : (
            <div className="text-center flex flex-col items-center">
              <p className="text-gray-100 text-9xl font-bold uppercase tracking-widest select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">Blank</p>
              {!localStorage.getItem('gemini_api_key') && (
                <div className="z-10 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 w-80">
                  <h3 className="text-sm font-bold mb-4 text-gray-500 uppercase tracking-tight">Enter Gemini API Key</h3>
                  <input
                    type="password"
                    placeholder="Paste key here..."
                    className="w-full p-2 border rounded-lg mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        localStorage.setItem('gemini_api_key', e.target.value);
                        window.location.reload();
                      }
                    }}
                  />
                  <p className="text-[10px] text-gray-400">Press Enter to save. Key is stored locally.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {showBackend && (
          <div className="absolute inset-0 bg-white z-50 flex flex-col border-t border-gray-100 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
             <BackendInterface isDetached={false} onClose={() => setShowBackend(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
