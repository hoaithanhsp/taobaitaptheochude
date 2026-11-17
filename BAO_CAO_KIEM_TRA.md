# BAO_CAO_KIEM_TRA

## 1. Tóm tắt
- Đã rà soát và chỉnh sửa các luồng cấu hình API/model để phù hợp yêu cầu mới.
- Tập trung vào validator API key, model mặc định, chuỗi fallback, xử lý lỗi 502/503/504/429 và việc không lộ API key ra console.

## 2. Lỗi đã phát hiện và sửa
- Sửa model mặc định từ `gemini-3.6-flash` sang `gemini-3.8-flash`.
- Cập nhật danh sách model Gemini và fallback chain theo thứ tự yêu cầu: `gemini-3.8-flash → gemini-3.7-flash → gemini-3.5-flash-lite → gemini-3.6-flash → gemini-3.5-flash → gemini-3.1-flash-lite → gemini-2.5-flash`.
- Loại bỏ model đã shutdown/không còn phù hợp khỏi danh sách chọn model và fallback.
- Giữ validator API key theo mẫu chấp nhận cả `AIzaSy` và `AQ`.
- Điều chỉnh lỗi tạm thời để fallback model thay vì bị hiểu nhầm là lỗi key.
- Giữ logic xử lý 429 theo hướng quota/cooldown, không gắn nhãn key invalid.
- Không để API key xuất hiện trong console log.
- Chuẩn hoá `thinkingConfig` cho Gemini 3 để không dùng `minimal`; chỉ dùng mức `high`.
- Bổ sung chặn gửi `temperature/topP/topK` cho Gemini 3.

## 3. Lỗi chưa sửa được
- Chưa có bộ test tự động chuyên biệt cho các luồng fallback thực tế với API Google, nên chỉ xác nhận qua rà soát code và build dự án.

## 4. Đề xuất cải thiện thêm
- Bổ sung test unit cho hàm parse lỗi và chuỗi fallback model.
- Tách cấu hình model vào file riêng để dễ bảo trì khi Google thay đổi danh sách model.
- Thêm guard/telemetry thân thiện hơn khi API trả lỗi 502/503/504 kéo dài.

## 5. Checklist api.md
- [x] Validator API key chấp nhận cả `AIzaSy` và `AQ`
- [x] Model mặc định là `gemini-3.8-flash`
- [x] Chuỗi fallback đúng thứ tự yêu cầu
- [x] Đã loại model shutdown/không còn phù hợp
- [x] Gemini 3 chỉ dùng thinking level low/medium/high
- [x] Không gửi temperature/topP/topK cho Gemini 3
- [x] Lỗi 503/502/504 fallback model, không báo sai key
- [x] Lỗi 429 chỉ cooldown key, không đánh dấu invalid
- [x] Không log API key ra console
