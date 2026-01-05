import React from 'react';
import { GRADES, QUESTION_TYPES, DIFFICULTIES, QUESTION_COUNTS, SUBJECTS, LIT_PAGE_COUNTS } from '../constants';
import { ExamRequest, QuestionType, AIModelId } from '../types';

interface InputFormProps {
  request: ExamRequest;
  onChange: (field: keyof ExamRequest, value: string | number) => void;
  onSubmit: () => void;
  isGenerating: boolean;
}

const MODELS: { id: AIModelId; name: string; desc: string; badge?: string }[] = [
  { 
    id: 'gemini-3-flash-preview', 
    name: 'Gemini 3 Flash', 
    desc: 'Tốc độ cực nhanh, thông minh', 
    badge: 'Khuyên dùng' 
  },
  { 
    id: 'gemini-3-pro-preview', 
    name: 'Gemini 3 Pro', 
    desc: 'Tư duy logic phức tạp tốt hơn' 
  },
  { 
    id: 'gemini-2.5-flash', 
    name: 'Gemini 2.5 Flash', 
    desc: 'Phiên bản ổn định, tiết kiệm' 
  },
];

export const InputForm: React.FC<InputFormProps> = ({
  request,
  onChange,
  onSubmit,
  isGenerating,
}) => {
  const isLiterature = request.subject === 'Ngữ văn / Tiếng Việt';
  const isEssayType = request.type === QuestionType.Essay;

  return (
    <div className="bg-white rounded-xl shadow-md border border-teal-100 p-6 space-y-6">
      <div className="border-b border-teal-50 pb-4 mb-4">
        <h2 className="text-xl font-bold text-teal-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Cấu hình đề thi
        </h2>
        <p className="text-sm text-slate-500 mt-1">Hỗ trợ tất cả các môn từ Lớp 1 đến Lớp 12 (Chương trình 2018)</p>
      </div>

      {/* Model Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-teal-900">Chọn Mô hình AI (Model)</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODELS.map((model) => (
            <div
              key={model.id}
              onClick={() => onChange('model', model.id)}
              className={`cursor-pointer rounded-lg border p-3 transition-all relative ${
                request.model === model.id
                  ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500 shadow-md'
                  : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 hover:shadow-sm'
              }`}
            >
              {model.badge && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {model.badge}
                </span>
              )}
              <div className={`font-semibold text-sm ${request.model === model.id ? 'text-teal-900' : 'text-slate-800'}`}>{model.name}</div>
              <div className="text-xs text-slate-500 mt-1">{model.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Subject */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-teal-900">Môn học</label>
          <div className="relative">
            <select
              value={request.subject}
              onChange={(e) => onChange('subject', e.target.value)}
              className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm border transition-shadow shadow-sm appearance-none hover:border-teal-300"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Grade */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-teal-900">Khối Lớp</label>
          <div className="relative">
            <select
              value={request.grade}
              onChange={(e) => onChange('grade', e.target.value)}
              className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm border transition-shadow shadow-sm appearance-none hover:border-teal-300"
            >
              {GRADES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Topic */}
        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-semibold text-teal-900">Chủ đề (Nội dung kiến thức)</label>
          <input
            type="text"
            value={request.topic}
            onChange={(e) => onChange('topic', e.target.value)}
            placeholder="Ví dụ: Phép cộng trong phạm vi 100, Câu đơn, Thì hiện tại đơn, Tình yêu quê hương..."
            className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm border transition-shadow shadow-sm hover:border-teal-300"
          />
        </div>

        {/* Specific Requirements */}
        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-semibold text-teal-900">
            Dạng bài tập / Yêu cầu cụ thể (Tùy chọn)
          </label>
          <textarea
            value={request.specificRequirements || ''}
            onChange={(e) => onChange('specificRequirements', e.target.value)}
            placeholder="Ví dụ: Tập trung vào phân tích nhân vật... (Để trống nếu muốn bao quát cả chủ đề)"
            rows={2}
            className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm border transition-shadow shadow-sm resize-none hover:border-teal-300"
          />
        </div>

        {/* Question Type */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-teal-900">Loại câu hỏi</label>
          <div className="relative">
            <select
              value={request.type}
              onChange={(e) => onChange('type', e.target.value)}
              className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm border transition-shadow shadow-sm appearance-none hover:border-teal-300"
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Conditional Fields based on Subject/Type */}
        {isLiterature || isEssayType ? (
          <>
             <div className="space-y-2">
               <label className="block text-sm font-semibold text-teal-900">Độ dài bài văn mẫu (Dự kiến)</label>
               <div className="relative">
                 <select
                   value={request.literaturePageCount || 2}
                   onChange={(e) => onChange('literaturePageCount', parseInt(e.target.value))}
                   className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm border transition-shadow shadow-sm appearance-none hover:border-teal-300"
                 >
                   {LIT_PAGE_COUNTS.map((c) => (
                     <option key={c} value={c}>{c} trang (Khoảng {c * 400}-{c * 500} từ)</option>
                   ))}
                 </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                 </div>
               </div>
             </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-teal-900">Mức độ</label>
              <div className="relative">
                <select
                  value={request.difficulty}
                  onChange={(e) => onChange('difficulty', e.target.value)}
                  className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm border transition-shadow shadow-sm appearance-none hover:border-teal-300"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                 </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-teal-900">Số lượng câu hỏi</label>
               <div className="relative">
                <select
                  value={request.questionCount}
                  onChange={(e) => onChange('questionCount', parseInt(e.target.value))}
                  className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm border transition-shadow shadow-sm appearance-none hover:border-teal-300"
                >
                  {QUESTION_COUNTS.map((count) => (
                    <option key={count} value={count}>{count} câu</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="pt-4">
        <button
          onClick={onSubmit}
          disabled={isGenerating || !request.topic.trim()}
          className={`w-full flex items-center justify-center py-4 px-6 rounded-lg text-white font-bold text-lg transition-all duration-200 shadow-lg ${
            isGenerating || !request.topic.trim()
              ? 'bg-slate-400 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 shadow-teal-500/30 transform hover:-translate-y-0.5'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang khởi tạo đề thi...
            </>
          ) : (
            'Tạo Đề Thi Ngay'
          )}
        </button>
      </div>
    </div>
  );
};