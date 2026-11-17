import React, { useState, useCallback, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { ExamDisplay } from './components/ExamDisplay';
import { ApiKeyModal } from './components/ApiKeyModal';
import { Grade, QuestionType, Difficulty, ExamRequest, AiProvider } from './types';
import {
  generateExamStream,
  GEMINI_MODELS,
  AGENT_PLATFORM_MODELS,
} from './services/geminiService';

const App: React.FC = () => {
  // Provider & API Keys State
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [agentPlatformKey, setAgentPlatformKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);

  // Request State
  const [request, setRequest] = useState<ExamRequest>({
    subject: 'Toán',
    grade: Grade.Grade12,
    topic: '',
    specificRequirements: '',
    type: QuestionType.Mixed,
    difficulty: Difficulty.Mixed,
    questionCount: 10,
    model: 'gemini-3.8-flash',
  });

  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<{ from: string; to: string; reason: string } | null>(null);

  // Khởi tạo Provider & Key từ LocalStorage
  useEffect(() => {
    let savedProvider = localStorage.getItem('google_ai_provider') as AiProvider;
    // Chuyển đổi 'vertex' cũ về 'gemini'
    if (savedProvider as string === 'vertex' || !savedProvider) {
      savedProvider = 'gemini';
      localStorage.setItem('google_ai_provider', 'gemini');
    }

    const savedGeminiKey = localStorage.getItem('gemini_api_key') || '';
    const savedAgentKey = localStorage.getItem('agent_platform_api_key') || '';

    setProvider(savedProvider);
    setGeminiKey(savedGeminiKey);
    setAgentPlatformKey(savedAgentKey);

    const activeKey = savedProvider === 'agent-platform' ? savedAgentKey : savedGeminiKey;
    if (!activeKey) {
      setIsApiKeyModalOpen(true);
    }

    // Đảm bảo model phù hợp với provider đã lưu
    const validModels = savedProvider === 'agent-platform'
      ? AGENT_PLATFORM_MODELS.map(m => m.id)
      : GEMINI_MODELS.map(m => m.id);

    if (!validModels.includes(request.model)) {
      const defaultModel = savedProvider === 'agent-platform' ? 'gemini-2.5-flash' : 'gemini-3.8-flash';
      setRequest(prev => ({ ...prev, model: defaultModel }));
    }
  }, []);

  const activeApiKey = provider === 'agent-platform' ? agentPlatformKey : geminiKey;

  const handleSaveApiKey = (newProvider: AiProvider, newKey: string) => {
    setProvider(newProvider);
    if (newProvider === 'gemini') {
      setGeminiKey(newKey);
    } else {
      setAgentPlatformKey(newKey);
    }

    // Đảm bảo model phù hợp với provider mới
    const validModels = newProvider === 'agent-platform'
      ? AGENT_PLATFORM_MODELS.map(m => m.id)
      : GEMINI_MODELS.map(m => m.id);

    const defaultModel = newProvider === 'agent-platform' ? 'gemini-2.5-flash' : 'gemini-3.8-flash';

    setRequest(prev => ({
      ...prev,
      model: validModels.includes(prev.model) ? prev.model : defaultModel
    }));

    setIsApiKeyModalOpen(false);
    setError(null);
  };

  const handleInputChange = useCallback((field: keyof ExamRequest, value: string | number) => {
    setRequest((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleGenerate = async () => {
    if (!activeApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    if (!request.topic.trim()) {
      setError('Vui lòng nhập chủ đề.');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    setError(null);
    setFallbackNotice(null);

    let accumulatedText = '';
    let lastUpdateTime = 0;

    try {
      await generateExamStream(
        request,
        activeApiKey,
        provider,
        (chunk) => {
          accumulatedText += chunk;
          const now = Date.now();
          if (now - lastUpdateTime > 100) {
            setGeneratedContent(accumulatedText);
            lastUpdateTime = now;
          }
        },
        (fromModel, toModel, reason) => {
          setFallbackNotice({ from: fromModel, to: toModel, reason });
        }
      );
      setGeneratedContent(accumulatedText);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi nghiêm trọng. Vui lòng thử lại sau.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* API Key Modal */}
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onSave={handleSaveApiKey} 
        onClose={() => setIsApiKeyModalOpen(false)}
        currentProvider={provider}
        geminiKey={geminiKey}
        agentPlatformKey={agentPlatformKey}
        forceRequire={!activeApiKey}
      />

      {/* Header */}
      <header className="bg-white border-b border-teal-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-teal-600 to-emerald-500 p-2 rounded-lg shadow-md shadow-teal-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-teal-900 tracking-tight line-clamp-1">TRỢ LÝ TẠO BÀI TẬP EDUGENVN</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsApiKeyModalOpen(true)}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                 provider === 'agent-platform'
                   ? 'border-indigo-200 hover:bg-indigo-50 text-indigo-800'
                   : 'border-teal-200 hover:bg-teal-50 text-teal-800'
               }`}
             >
               <span className={`w-2 h-2 rounded-full animate-pulse ${activeApiKey ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
               <span>{provider === 'agent-platform' ? 'Agent Platform API' : 'Google Gemini API'}</span>
               <span className="text-slate-400">|</span>
               {activeApiKey ? (
                 <span className="font-semibold text-emerald-600">Đã có Key</span>
               ) : (
                 <span className="font-semibold text-rose-600">Nhập API Key</span>
               )}
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-4 space-y-6">
            <InputForm 
              request={request}
              provider={provider}
              onChange={handleInputChange}
              onSubmit={handleGenerate}
              isGenerating={isGenerating}
            />

            {/* Helper Info Card */}
            <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-5 shadow-sm space-y-2">
              <h4 className="text-teal-900 font-bold flex items-center gap-2 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Hệ thống Fallback & Nhà cung cấp
              </h4>
              <ul className="text-xs text-teal-800 space-y-2 list-disc list-inside font-medium leading-relaxed">
                <li>Hỗ trợ chuyển đổi giữa <strong className="text-teal-950">Google Gemini API</strong> và <strong className="text-teal-950">Agent Platform API</strong>.</li>
                <li>Nếu Model bạn chọn bị quá tải hoặc tạm gián đoạn, hệ thống sẽ <strong className="text-teal-950">tự động chuyển sang Model dự phòng</strong>.</li>
                <li>Key được mã hóa an toàn trong LocalStorage của trình duyệt.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-8 space-y-4">

            {/* Fallback Warning Notice */}
            {fallbackNotice && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-start gap-3 shadow-sm text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 mt-0.5 min-w-[20px]"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                <div>
                  <p className="font-bold">Đã tự động chuyển đổi Model ({fallbackNotice.reason})</p>
                  <p className="text-xs mt-0.5">
                    Model gốc <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-bold">{fallbackNotice.from}</code> bị quá tải, hệ thống đã chuyển sang <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-bold">{fallbackNotice.to}</code> để tiếp tục xử lý.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3.5 rounded-xl flex items-start gap-3 shadow-sm">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 mt-0.5 min-w-[20px]"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                 <div className="flex-1">
                   <p className="font-bold text-sm">Đã xảy ra lỗi</p>
                   <p className="text-xs mt-1 leading-relaxed">{error}</p>
                 </div>
              </div>
            )}
            
            {generatedContent || isGenerating ? (
              <ExamDisplay content={generatedContent} />
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-teal-200 rounded-xl bg-white/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50 text-teal-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                <p className="font-medium text-teal-900">Chưa có nội dung</p>
                <p className="text-sm text-teal-600">Hãy cấu hình và nhấn "Tạo Đề Thi Ngay"</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Promotion */}
      <footer className="bg-slate-900 text-slate-300 py-8 px-4 mt-auto border-t-4 border-teal-600 no-print">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-6 p-6 bg-gradient-to-r from-teal-900/40 to-emerald-900/40 rounded-2xl border border-teal-500/30 backdrop-blur-sm shadow-xl">
            <p className="font-bold text-lg md:text-xl text-teal-100 mb-3 leading-relaxed">
              ĐĂNG KÝ KHOÁ HỌC THỰC CHIẾN VIẾT SKKN, TẠO APP DẠY HỌC, TẠO MÔ PHỎNG TRỰC QUAN <br className="hidden md:block" />
              <span className="text-yellow-400">CHỈ VỚI 1 CÂU LỆNH</span>
            </p>
            <a 
              href="https://forms.gle/d7AmcT9MTyGy7bJd8" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-bold rounded-full transition-all transform hover:-translate-y-1 shadow-lg shadow-teal-500/40 border border-teal-400/50"
            >
              ĐĂNG KÝ NGAY
            </a>
          </div>
          
          <div className="space-y-2 text-sm md:text-base">
            <p className="font-medium text-slate-400">Mọi thông tin vui lòng liên hệ:</p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6">
              <a 
                href="https://www.facebook.com/tranhoaithanhvicko/" 
                target="_blank" 
                rel="noreferrer"
                className="hover:text-teal-400 transition-colors duration-200 flex items-center gap-2"
              >
                <span className="font-bold">Facebook:</span> tranhoaithanhvicko
              </a>
              <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-slate-600"></div>
              <span className="hover:text-emerald-400 transition-colors duration-200 cursor-default flex items-center gap-2">
                 <span className="font-bold">Zalo:</span> 0348296773
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;