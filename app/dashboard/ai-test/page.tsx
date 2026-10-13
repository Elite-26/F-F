'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react';

type Status = 'idle' | 'processing' | 'finished' | 'error';

interface AIModel {
  id: string;
  name: string;
  enabled: boolean;
}

const models: AIModel[] = [
  { id: 'gemini-flash-latest', name: 'Gemini Flash Latest - Fast & Free ⚡', enabled: true },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash - Most Capable (Free)', enabled: true },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro - Most Capable (Free)', enabled: true },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash - Fast & Free ⚡', enabled: true },
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 - Smartest (Paid)', enabled: true },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Paid)', enabled: true },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Paid)', enabled: true },
];

export default function AITestPage() {
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setStatus('processing');
    setError('');
    setResult('');
    setMetadata(null);

    try {
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      setResult(data.result);
      setMetadata({
        model: data.model,
        usage: data.usage,
      });
      setStatus('finished');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setStatus('error');
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            <Loader2 className="animate-spin" size={20} />
            <span className="font-medium">Processing...</span>
          </div>
        );
      case 'finished':
        return (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
            <CheckCircle size={20} />
            <span className="font-medium">Finished</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            <XCircle size={20} />
            <span className="font-medium">Error</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2 text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
            <span className="font-medium">Ready</span>
          </div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Integration Test</h1>
        <p className="text-gray-600">Test AI model integration with Gemini (free) and Claude (paid)</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={status === 'processing'}
            >
              {models.map((model) => (
                <option 
                  key={model.id} 
                  value={model.id}
                  disabled={!model.enabled}
                >
                  {model.name} {!model.enabled && '(Coming Soon)'}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Gemini models are FREE. Claude models require API credits (paid).
            </p>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              disabled={status === 'processing'}
            />
          </div>

          {/* Submit Button and Status */}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={status === 'processing' || !prompt.trim()}
              className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'processing' ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Send Prompt</span>
                </>
              )}
            </button>

            {/* Status Badge */}
            {getStatusBadge()}
          </div>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-medium text-red-800 mb-1">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Result</h2>
            {metadata && (
              <div className="text-sm text-gray-500">
                Model: <span className="font-medium">{metadata.model}</span>
                {metadata.usage && (
                  <>
                    {' | '}
                    Tokens: <span className="font-medium">{metadata.usage.total_tokens}</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
              {result}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

