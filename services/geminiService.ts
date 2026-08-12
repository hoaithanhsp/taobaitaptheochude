import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { ExamRequest, QuestionType, AiProvider } from "../types";

export const GOOGLE_AI_API_KEY_PATTERN = /^(?:AIzaSy|AQ)\S{8,}$/;

export const cleanApiKey = (key: string): string => {
  return key.replace(/[^\x00-\x7F]/g, "").trim();
};

export const isValidApiKey = (key: string): boolean => {
  const cleaned = cleanApiKey(key);
  return GOOGLE_AI_API_KEY_PATTERN.test(cleaned);
};

// Client factory dùng chung - BẮT BUỘC THEO chuẩn api.md
export const createGoogleAiClient = (
  apiKey: string,
  provider: AiProvider
): GoogleGenAI => {
  const cleanedKey = cleanApiKey(apiKey);
  if (provider === 'agent-platform') {
    // Cờ kỹ thuật của Google Gen AI SDK để định tuyến tới aiplatform.googleapis.com
    return new GoogleGenAI({ vertexai: true, apiKey: cleanedKey });
  }
  return new GoogleGenAI({ apiKey: cleanedKey });
};

// Danh sách Model hỗ trợ cho Google Gemini API
export const GEMINI_MODELS = [
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    desc: 'Mặc định; siêu nhanh, thông minh & tối ưu',
    badge: 'Khuyên dùng'
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    desc: 'Chất lượng cao, dự phòng chuẩn'
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite',
    desc: 'Tốc độ cao, tối ưu chi phí'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    desc: 'Suy luận logic chuyên sâu'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    desc: 'Phiên bản ổn định, tiết kiệm'
  }
];

export const GEMINI_FALLBACK_CHAIN = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash'
];

// Danh sách Model hỗ trợ cho Agent Platform API
export const AGENT_PLATFORM_MODELS = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    desc: 'Mặc định Agent Platform; ổn định & tiết kiệm',
    badge: 'Mặc định'
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    desc: 'Tốc độ cao, đáp ứng tức thì'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    desc: 'Suy luận nâng cao'
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    desc: 'Thế hệ mới (Preview)'
  }
];

export const AGENT_PLATFORM_FALLBACK_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite'
];

// Lấy danh sách model có thứ tự (Model người dùng chọn đứng trước)
export const getOrderedModels = (selectedModel: string, provider: AiProvider): string[] => {
  const isAgentPlatform = provider === 'agent-platform';
  const fallbackChain = isAgentPlatform ? AGENT_PLATFORM_FALLBACK_CHAIN : GEMINI_FALLBACK_CHAIN;
  const validModelIds = isAgentPlatform
    ? AGENT_PLATFORM_MODELS.map(m => m.id)
    : GEMINI_MODELS.map(m => m.id);

  const defaultModel = isAgentPlatform ? 'gemini-2.5-flash' : 'gemini-3.6-flash';
  const initialModel = validModelIds.includes(selectedModel) ? selectedModel : defaultModel;

  const rawList = [initialModel, ...fallbackChain];
  return Array.from(new Set(rawList));
};

export type ApiErrorType =
  | 'API_KEY_INVALID'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_ARGUMENT'
  | 'MODEL_OVERLOADED'
  | 'NOT_FOUND'
  | 'UNKNOWN_ERROR';

export const parseApiError = (error: any): ApiErrorType => {
  const status = error?.status || error?.errorDetails?.[0]?.reason || error?.code;
  const msg = (error?.message || String(error)).toLowerCase();

  if (status === 401 || msg.includes('api_key_invalid') || msg.includes('invalid api key') || msg.includes('unauthorized')) {
    return 'API_KEY_INVALID';
  }
  if (status === 403 || msg.includes('permission_denied') || msg.includes('permission denied')) {
    return 'PERMISSION_DENIED';
  }
  if (status === 429 || msg.includes('resource_exhausted') || msg.includes('quota exceeded') || msg.includes('rate limit')) {
    return 'QUOTA_EXCEEDED';
  }
  if (status === 400 || msg.includes('invalid_argument') || msg.includes('bad request')) {
    return 'INVALID_ARGUMENT';
  }
  if (
    status === 500 ||
    status === 503 ||
    status === 504 ||
    msg.includes('overloaded') ||
    msg.includes('high demand') ||
    msg.includes('try again later') ||
    msg.includes('temporarily unavailable') ||
    msg.includes('service unavailable')
  ) {
    return 'MODEL_OVERLOADED';
  }
  if (status === 404 || msg.includes('not_found') || msg.includes('model not found')) {
    return 'NOT_FOUND';
  }
  return 'UNKNOWN_ERROR';
};

export const generateExamStream = async (
  request: ExamRequest,
  apiKey: string,
  provider: AiProvider,
  onChunk: (text: string) => void,
  onModelFallback?: (fromModel: string, toModel: string, reason: string) => void
): Promise<void> => {
  const cleanedKey = cleanApiKey(apiKey);
  if (!cleanedKey) {
    throw new Error("Vui lòng cấu hình API Key trước khi sử dụng tính năng này.");
  }

  // Kiểm tra ký tự Unicode
  if (/[^\x00-\x7F]/.test(cleanedKey)) {
    throw new Error("API Key không hợp lệ (chứa ký tự tiếng Việt hoặc ký tự lạ). Vui lòng kiểm tra lại API Key.");
  }

  const isLiterature = request.subject === 'Ngữ văn / Tiếng Việt';
  const isEssay = request.type === QuestionType.Essay;
  const isMixed = request.type === QuestionType.Mixed;

  let extraPrompt = '';

  if (isLiterature || isEssay) {
    extraPrompt = `
    LƯU Ý ĐẶC BIỆT: Đây là yêu cầu tạo đề Văn / Bài tự luận.
    1. Số lượng câu hỏi: Chỉ tạo 01 câu duy nhất.
    2. Yêu cầu đáp án (Trong PHẦN 2): BẮT BUỘC PHẢI BAO GỒM 2 MỤC:
       - A. Dàn ý chi tiết.
       - B. Bài văn hoàn chỉnh (Độ dài khoảng ${request.literaturePageCount || 2} trang).
    `;
  } else if (isMixed) {
    extraPrompt = `
    LƯU Ý QUAN TRỌNG: Loại câu hỏi "Kết hợp" - BẮT BUỘC PHẢI CÓ ĐỦ 4 DẠNG BÀI sau:
    1. TRẮC NGHIỆM 4 PHƯƠNG ÁN: Câu hỏi có 4 lựa chọn A, B, C, D.
    2. ĐÚNG-SAI: Câu khẳng định, học sinh chọn Đúng hoặc Sai.
    3. TRẢ LỜI NGẮN: Đáp án là một số (tối đa 4 ký tự).
    4. TỰ LUẬN: Câu hỏi yêu cầu trình bày, giải thích ngắn gọn.
    
    Phân bổ ${request.questionCount} câu: Chia đều cho 4 dạng (mỗi dạng ít nhất 1 câu).
    Trình bày theo từng PHẦN: PHẦN I (Trắc nghiệm), PHẦN II (Đúng-Sai), PHẦN III (Trả lời ngắn), PHẦN IV (Tự luận).
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

  const modelsToTry = getOrderedModels(request.model, provider);
  const ai = createGoogleAiClient(cleanedKey, provider);

  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    try {
      console.log(`[${provider}] Attempting generation with model: ${currentModel}`);

      const config: any = {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 8192,
      };

      // Chỉ thêm thinkingConfig cho model Gemini 3
      if (currentModel.includes('gemini-3')) {
        config.thinkingConfig = { thinkingLevel: 'HIGH' };
      }

      const responseStream = await ai.models.generateContentStream({
        model: currentModel,
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        config,
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          onChunk(text);
        }
      }

      // Đã tạo xong thành công
      return;

    } catch (error: any) {
      console.warn(`[${provider}] Model ${currentModel} failed:`, error);
      lastError = error;

      const errorType = parseApiError(error);

      // Các lỗi nghiêm trọng -> Dừng ngay không fallback
      if (errorType === 'API_KEY_INVALID') {
        throw new Error("API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại trong Cài đặt.");
      }
      if (errorType === 'QUOTA_EXCEEDED') {
        throw new Error("Đã hết quota hoặc vượt giới hạn tốc độ API. Vui lòng đợi rồi thử lại.");
      }
      if (errorType === 'PERMISSION_DENIED') {
        if (provider === 'agent-platform') {
          // Với Agent Platform API, có thể thử model tương thích tiếp theo trước khi báo lỗi
          if (i < modelsToTry.length - 1) {
            const nextModel = modelsToTry[i + 1];
            if (onModelFallback) {
              onModelFallback(currentModel, nextModel, "Dự án/Key chưa được cấp quyền truy cập model hiện tại");
            }
            continue;
          }
          throw new Error("API key không có quyền truy cập Agent Platform API hoặc model này. Vui lòng kiểm tra lại quyền trong dự án Google Cloud.");
        } else {
          throw new Error("API key không có quyền truy cập Gemini API.");
        }
      }
      if (errorType === 'INVALID_ARGUMENT') {
        throw new Error(`Yêu cầu không hợp lệ (${error.message || 'INVALID_ARGUMENT'}).`);
      }

      // Nếu lỗi cho phép fallback (Quá tải, 500, 503, NOT_FOUND...) và còn model tiếp theo
      if (i < modelsToTry.length - 1) {
        const nextModel = modelsToTry[i + 1];
        const reason = errorType === 'NOT_FOUND' ? 'Model không khả dụng' : 'Model đang quá tải';
        console.info(`[${provider}] Fallback triggered: ${currentModel} -> ${nextModel} (${reason})`);
        if (onModelFallback) {
          onModelFallback(currentModel, nextModel, reason);
        }
        continue;
      }
    }
  }

  const finalErrorType = parseApiError(lastError);
  if (finalErrorType === 'MODEL_OVERLOADED') {
    throw new Error("Model đang quá tải; app đã tự động thử các model dự phòng nhưng không thành công. Vui lòng thử lại sau.");
  }

  throw lastError || new Error("Không thể tạo đề thi với bất kỳ model nào. Vui lòng kiểm tra API Key hoặc thử lại sau.");
};
