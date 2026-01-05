import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { ExamRequest, QuestionType, AIModelId } from "../types";

// Danh sách ưu tiên fallback
const FALLBACK_ORDER: AIModelId[] = [
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-flash'
];

export const generateExamStream = async (
  request: ExamRequest,
  apiKey: string,
  onChunk: (text: string) => void
): Promise<void> => {
  if (!apiKey) {
    throw new Error("Vui lòng nhập API Key để sử dụng.");
  }

  // KIỂM TRA QUAN TRỌNG: API Key không được chứa ký tự Unicode (Tiếng Việt)
  // Lỗi "non ISO-8859-1 code point" xảy ra do key chứa ký tự lạ.
  // eslint-disable-next-line no-control-regex
  if (/[^\x00-\x7F]/.test(apiKey)) {
    throw new Error("API Key không hợp lệ (chứa ký tự tiếng Việt hoặc ký tự lạ). Vui lòng xóa và nhập lại API Key chuẩn.");
  }

  const isLiterature = request.subject === 'Ngữ văn / Tiếng Việt';
  const isEssay = request.type === QuestionType.Essay;

  let extraPrompt = '';
  
  if (isLiterature || isEssay) {
    extraPrompt = `
    LƯU Ý ĐẶC BIỆT: Đây là yêu cầu tạo đề Văn / Bài tự luận.
    1. Số lượng câu hỏi: Chỉ tạo 01 câu duy nhất.
    2. Yêu cầu đáp án: BẮT BUỘC PHẢI BAO GỒM 2 PHẦN:
       - Phần 1: Dàn ý chi tiết.
       - Phần 2: Bài văn hoàn chỉnh (Độ dài khoảng ${request.literaturePageCount || 2} trang).
    `;
  }

  const userPrompt = `
    Hãy tạo đề thi với các thông số sau:
    - Môn học: ${request.subject}
    - Khối lớp: ${request.grade}
    - Chủ đề: ${request.topic}
    - Dạng bài tập/Yêu cầu cụ thể: ${request.specificRequirements ? request.specificRequirements : 'Không có (Tạo bài tập bao quát cả chủ đề)'}
    - Loại câu hỏi: ${request.type}
    - Mức độ: ${request.difficulty}
    - Số lượng câu hỏi: ${isLiterature || isEssay ? '1 câu (Bài làm văn)' : request.questionCount}
    ${extraPrompt}
    
    Hãy lưu ý đặc thù của môn ${request.subject} ở lớp ${request.grade} để sử dụng ngôn ngữ và kiến thức phù hợp nhất.
  `;

  // Xác định danh sách model cần thử: Bắt đầu bằng model người dùng chọn, sau đó là các model còn lại theo thứ tự ưu tiên
  const modelsToTry = [
    request.model,
    ...FALLBACK_ORDER.filter(m => m !== request.model)
  ];

  // Loại bỏ trùng lặp (nếu có)
  const uniqueModels = [...new Set(modelsToTry)];

  let lastError: any = null;

  for (const modelId of uniqueModels) {
    try {
      console.log(`Attempting generation with model: ${modelId}`);
      
      const ai = new GoogleGenAI({ apiKey });
      
      const responseStream = await ai.models.generateContentStream({
        model: modelId,
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.4,
          maxOutputTokens: 8192,
          thinkingConfig: modelId.includes('gemini-2.5') ? undefined : { thinkingBudget: 0 }, 
        },
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          onChunk(text);
        }
      }

      // Nếu chạy thành công đến đây, thoát khỏi vòng lặp
      return;

    } catch (error: any) {
      console.warn(`Model ${modelId} failed:`, error);
      lastError = error;
      // Tiếp tục vòng lặp để thử model tiếp theo
    }
  }

  // Nếu thử hết tất cả model mà vẫn lỗi
  throw lastError || new Error("Không thể tạo đề thi với bất kỳ model nào. Vui lòng kiểm tra API Key hoặc thử lại sau.");
};