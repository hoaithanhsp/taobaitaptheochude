import React, { useState, useEffect } from 'react';
import { AiProvider } from '../types';
import { cleanApiKey, GOOGLE_AI_API_KEY_PATTERN } from '../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (provider: AiProvider, key: string) => void;
  onClose: () => void;
  currentProvider: AiProvider;
  geminiKey: string;
  agentPlatformKey: string;
  forceRequire: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onSave,
  onClose,
  currentProvider,
  geminiKey,
  agentPlatformKey,
  forceRequire,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>(currentProvider || 'gemini');
  const [inputGeminiKey, setInputGeminiKey] = useState<string>(geminiKey || '');
  const [inputAgentKey, setInputAgentKey] = useState<string>(agentPlatformKey || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedProvider(currentProvider || 'gemini');
    setInputGeminiKey(geminiKey || '');
    setInputAgentKey(agentPlatformKey || '');
    setValidationError(null);
  }, [currentProvider, geminiKey, agentPlatformKey, isOpen]);

  if (!isOpen) return null;

  const currentInputKey = selectedProvider === 'gemini' ? inputGeminiKey : inputAgentKey;

  const handleProviderChange = (provider: AiProvider) => {
    setSelectedProvider(provider);
    setValidationError(null);
  };

  const handleKeyChange = (val: string) => {
    setValidationError(null);
    if (selectedProvider === 'gemini') {
      setInputGeminiKey(val);
    } else {
      setInputAgentKey(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = cleanApiKey(currentInputKey);

    if (!cleanKey) {
      setValidationError("Vui lòng nhập API Key.");
      return;
    }

    if (!GOOGLE_AI_API_KEY_PATTERN.test(cleanKey)) {
      setValidationError("Định dạng API Key không hợp lệ. Key thường bắt đầu bằng 'AIzaSy...' hoặc 'AQ...'.");
      return;
    }

    // Lưu riêng key theo dịch vụ
    if (selectedProvider === 'gemini') {
      localStorage.setItem('gemini_api_key', cleanKey);
    } else {
      localStorage.setItem('agent_platform_api_key', cleanKey);
    }

    // Lưu nhà cung cấp & nguồn xác nhận thủ công
    localStorage.setItem('google_ai_provider', selectedProvider);
    localStorage.setItem('google_ai_provider_selection_source', 'manual');

    onSave(selectedProvider, cleanKey);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 border border-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Cấu hình API Key & Nhà Cung Cấp
          </h3>
          {!forceRequire && (
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          )}
        </div>
        
        <div className="p-6 space-y-5">
          <p className="text-slate-600 text-sm leading-relaxed">
            Vui lòng chọn dịch vụ AI và nhập API Key của bạn. Key được lưu an toàn trên trình duyệt cá nhân.
          </p>

          {/* Provider Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Chọn Nhà Cung Cấp AI (Provider)
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                className={`py-2.5 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  selectedProvider === 'gemini'
                    ? 'bg-white text-teal-800 shadow-sm border border-teal-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${selectedProvider === 'gemini' ? 'bg-teal-500' : 'bg-slate-300'}`}></span>
                Google Gemini API
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('agent-platform')}
                className={`py-2.5 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  selectedProvider === 'agent-platform'
                    ? 'bg-white text-indigo-900 shadow-sm border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${selectedProvider === 'agent-platform' ? 'bg-indigo-500' : 'bg-slate-300'}`}></span>
                Agent Platform API
              </button>
            </div>
          </div>

          {/* Provider Specific Instructions */}
          {selectedProvider === 'gemini' ? (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 text-xs text-teal-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1 text-teal-950">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Google Gemini API (AI Studio)
              </p>
              <p>Key chuẩn sử dụng cho các model Gemini 3.8 Flash, 3.7 Flash, 3.5 Flash...</p>
              <p>Lấy API Key miễn phí tại: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline font-bold text-teal-700 hover:text-teal-900">Google AI Studio (aistudio.google.com)</a></p>
            </div>
          ) : (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1 text-indigo-950">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Agent Platform API (Google Cloud)
              </p>
              <p>Dịch vụ doanh nghiệp kết nối trực tiếp qua Google Cloud Agent Platform endpoint.</p>
              <p>Xem hướng dẫn tạo Key tại: <a href="https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/api-keys" target="_blank" rel="noreferrer" className="underline font-bold text-indigo-700 hover:text-indigo-900">Google Cloud Agent Platform Docs</a></p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                API Key cho {selectedProvider === 'gemini' ? 'Google Gemini API' : 'Agent Platform API'}
              </label>
              <input
                type="password"
                value={currentInputKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder={selectedProvider === 'gemini' ? "AIzaSy... hoặc AQ..." : "AQ... hoặc AIzaSy..."}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                  validationError
                    ? 'border-rose-400 focus:ring-2 focus:ring-rose-400 bg-rose-50/20'
                    : selectedProvider === 'gemini'
                    ? 'border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
                    : 'border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
                autoFocus
              />
              {validationError && (
                <p className="text-xs text-rose-600 mt-1.5 font-medium">{validationError}</p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={!currentInputKey.trim()}
              className={`w-full py-3.5 px-4 text-white font-bold rounded-xl shadow-md transition-all transform active:scale-[0.98] text-sm ${
                !currentInputKey.trim()
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : selectedProvider === 'gemini'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-teal-500/20'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-500/20'
              }`}
            >
              Lưu Cấu Hình & Bắt Đầu
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};