import React, { useState, useCallback, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { ExamDisplay } from './components/ExamDisplay';
import { ApiKeyModal } from './components/ApiKeyModal';
import { Grade, QuestionType, Difficulty, ExamRequest } from './types';
import { generateExamStream } from './services/geminiService';

const App: React.FC = () => {
  const [request, setRequest] = useState<ExamRequest>({
    subject: 'Toán',
    grade: Grade.Grade12,
    topic: '',
    specificRequirements: '',
    type: QuestionType.Mixed,
    difficulty: Difficulty.Mixed,
    questionCount: 10,
    model: 'gemini-3-flash-preview', // Default model
  });

  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // API Key State
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setIsApiKeyModalOpen(true);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setIsApiKeyModalOpen(false);
  };

  const handleInputChange = useCallback((field: keyof ExamRequest, value: string | number) => {
    setRequest((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleGenerate = async () => {
    if (!apiKey) {
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

    let accumulatedText = '';
    let lastUpdateTime = 0;

    try {
      await generateExamStream(request, apiKey, (chunk) => {
        accumulatedText += chunk;
        const now = Date.now();
        if (now - lastUpdateTime > 100) {
          setGeneratedContent(accumulatedText);
          lastUpdateTime = now;
        }
      });
      setGeneratedContent(accumulatedText);
    } catch (err: any) {
      // Handle fallback errors or final failure
      setError(err.message || "Đã xảy ra lỗi nghiêm trọng. Vui lòng kiểm tra API Key.");
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
        currentKey={apiKey}
        forceRequire={!apiKey}
      />

      {/* Header */}
      <header className="bg-white border-b border-teal-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-teal-600 to-emerald-500 p-2 rounded-lg shadow-md shadow-teal-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-teal-900 tracking-tight line-clamp-1">EDUGEN VN BY TRẦN HOÀI THANH</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsApiKeyModalOpen(true)}
               className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-200 hover:bg-teal-50 text-xs font-medium transition-colors text-teal-700"
             >
               <span className={`w-2 h-2 rounded-full animate-pulse ${apiKey ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
               {apiKey ? 'Đã có API Key' : <span className="text-red-500 font-bold">Nhập API Key</span>}
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
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
              onChange={handleInputChange}
              onSubmit={handleGenerate}
              isGenerating={isGenerating}
            />

            {/* Helper Info Card */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-teal-900 font-bold mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Hệ thống tự động
              </h4>
              <ul className="text-sm text-teal-800 space-y-2 list-disc list-inside font-medium">
                <li>Nếu Model bạn chọn bị quá tải, hệ thống sẽ <strong className="text-teal-900">tự động chuyển</strong> sang Model khác để đảm bảo bạn luôn nhận được kết quả.</li>
                <li>Key của bạn được lưu an toàn trên trình duyệt này.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-8">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 shadow-sm">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mt-0.5 min-w-[20px]"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                 <div className="flex-1">
                   <p className="font-bold">Đã xảy ra lỗi</p>
                   <p className="text-sm mt-1">{error}</p>
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