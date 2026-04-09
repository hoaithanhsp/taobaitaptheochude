import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak, AlignmentType, Table, TableRow, TableCell, BorderStyle, WidthType } from "docx";

interface ExamDisplayProps {
  content: string;
}

export const ExamDisplay: React.FC<ExamDisplayProps> = ({ content }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // Parse the content into two parts based on the headers defined in SYSTEM_INSTRUCTION
  const { questionsPart, answersPart } = useMemo(() => {
    // Danh sách các marker có thể xuất hiện (ưu tiên chính xác nhất)
    const markers = [
      "### PHẦN 2: ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT",
      "### PHẦN 2: ĐÁP ÁN VÀ HƯỚNG DẪN CHI TIẾT",
      "### PHẦN 2: ĐÁP ÁN",
      "PHẦN 2: ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT", // Trường hợp mất dấu ###
      "PHẦN 2: ĐÁP ÁN" // Fallback cuối cùng
    ];

    let splitIndex = -1;
    let matchedMarker = "";

    // Tìm marker xuất hiện đầu tiên trong văn bản
    for (const marker of markers) {
      const idx = content.indexOf(marker);
      if (idx !== -1) {
        splitIndex = idx;
        matchedMarker = marker;
        break;
      }
    }

    // Nếu tìm thấy điểm cắt
    if (splitIndex !== -1) {
      const part1 = content.substring(0, splitIndex);
      const part2 = content.substring(splitIndex); // Giữ lại cả marker ở phần 2

      return {
        questionsPart: part1.trim(),
        answersPart: part2.trim()
      };
    }

    // Nếu chưa tạo đến phần 2, toàn bộ là phần 1
    return {
      questionsPart: content.trim(),
      answersPart: ''
    };
  }, [content]);

  if (!content) return null;

  const handleDownloadWord = async () => {
    setIsDownloading(true);
    try {
      // Hàm xử lý text - giữ nguyên LaTeX, chỉ loại bỏ markdown bold markers
      const processText = (text: string): string => {
        // Giữ nguyên định dạng LaTeX (bao gồm $...$, $$...$$, \frac, \sqrt, v.v.)
        // Chỉ loại bỏ markdown bold markers **text**
        return text.replace(/\*\*/g, '');
      };

      // Hàm tạo bảng Word từ markdown table
      const createTableFromMarkdown = (tableLines: string[]): Table => {
        const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
        const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

        const rows: TableRow[] = [];

        for (let i = 0; i < tableLines.length; i++) {
          const line = tableLines[i].trim();
          // Bỏ qua dòng separator (|---|---|)
          if (line.match(/^\|[-:\s|]+\|$/)) continue;

          // Parse cells từ dòng markdown table
          const cells = line.split('|').filter(cell => cell.trim() !== '');

          if (cells.length > 0) {
            const isHeader = i === 0;
            rows.push(new TableRow({
              tableHeader: isHeader,
              children: cells.map(cellText => new TableCell({
                borders,
                width: { size: Math.floor(9000 / cells.length), type: WidthType.DXA },
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({
                    text: cellText.trim(),
                    bold: isHeader,
                    size: 22,
                    font: "Times New Roman"
                  })]
                })]
              }))
            }));
          }
        }

        if (rows.length === 0) {
          throw new Error("Table has no valid rows");
        }

        return new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows
        });
      };

      // Hàm kiểm tra xem một dòng có phải là markdown table không
      const isTableLine = (line: string): boolean => {
        return line.trim().startsWith('|') && line.trim().endsWith('|');
      };

      const createParagraphsFromMarkdown = (text: string): (Paragraph | Table)[] => {
        const elements: (Paragraph | Table)[] = [];
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const cleanLine = line.trim();

          if (!cleanLine) {
            elements.push(new Paragraph({ children: [new TextRun({ text: "", font: "Times New Roman" })] }));
            continue;
          }

          // Xử lý markdown table (Bảng đáp án nhanh)
          if (isTableLine(cleanLine)) {
            // Thu thập tất cả các dòng của table
            const tableLines: string[] = [cleanLine];
            while (i + 1 < lines.length && isTableLine(lines[i + 1].trim())) {
              i++;
              tableLines.push(lines[i].trim());
            }
            // Tạo bảng Word (cần ít nhất 2 dòng và phải có row thực tế, không chỉ separator)
            if (tableLines.length >= 2) {
              try {
                const table = createTableFromMarkdown(tableLines);
                elements.push(table);
                elements.push(new Paragraph({ children: [new TextRun({ text: "", font: "Times New Roman" })] })); // Spacing after table
              } catch (e) {
                // Nếu tạo bảng thất bại, fallback hiển thị dạng text
                for (const tl of tableLines) {
                  elements.push(new Paragraph({
                    children: [new TextRun({ text: tl.replace(/\|/g, ' | ').trim(), size: 24, font: "Times New Roman" })],
                    spacing: { after: 80 }
                  }));
                }
              }
            }
            continue;
          }

          // Xử lý LaTeX trong dòng
          const processedLine = processText(cleanLine);

          // Headers
          if (cleanLine.startsWith('### ')) {
            elements.push(new Paragraph({
              children: [new TextRun({
                text: processText(cleanLine.replace('### ', '')),
                bold: true,
                size: 26,
                font: "Times New Roman"
              })],
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 300, after: 150 }
            }));
            continue;
          }
          if (cleanLine.startsWith('## ')) {
            elements.push(new Paragraph({
              children: [new TextRun({
                text: processText(cleanLine.replace('## ', '')),
                bold: true,
                size: 28,
                font: "Times New Roman"
              })],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150 }
            }));
            continue;
          }

          // Kiểm tra nếu là câu hỏi (Câu X:, Câu X., Câu X) - chỉ in đậm phần tiêu đề, không in đậm nội dung
          const questionMatch = cleanLine.match(/^(\*\*)?(Câu|Bài)\s*\d+[^:]*:/i);
          if (questionMatch) {
            const titleEnd = cleanLine.indexOf(':', questionMatch[0].length - 1) + 1;
            const title = cleanLine.substring(0, titleEnd).replace(/\*\*/g, '');
            const content = cleanLine.substring(titleEnd).trim();

            const children: TextRun[] = [
              new TextRun({
                text: title + " ",
                bold: true,
                size: 24,
                font: "Times New Roman"
              })
            ];

            if (content) {
              children.push(new TextRun({
                text: content,
                size: 24,
                font: "Times New Roman"
              }));
            }

            elements.push(new Paragraph({
              children,
              spacing: { before: 300, after: 120 }
            }));
            continue;
          }

          // Kiểm tra nếu là "Lời giải", "Hướng dẫn giải", "Giải" - in đậm
          if (cleanLine.match(/^(\*\*)?(Lời giải|Hướng dẫn giải|Giải|Đáp án đúng)/i)) {
            elements.push(new Paragraph({
              children: [new TextRun({
                text: processText(cleanLine),
                bold: true,
                size: 24,
                font: "Times New Roman"
              })],
              spacing: { before: 200, after: 100 }
            }));
            continue;
          }

          // Kiểm tra nếu là đáp án A., B., C., D. - in đậm ký tự đầu
          const answerMatch = processedLine.match(/^([A-D])\.\s*(.*)$/);
          if (answerMatch) {
            elements.push(new Paragraph({
              children: [
                new TextRun({
                  text: answerMatch[1] + ". ",
                  bold: true,
                  size: 24,
                  font: "Times New Roman"
                }),
                new TextRun({
                  text: answerMatch[2],
                  size: 24,
                  font: "Times New Roman"
                })
              ],
              spacing: { after: 80 }
            }));
            continue;
          }

          // Xử lý bullet points markdown (-, +, *) thành dạng trực quan
          let displayLine = processedLine;
          let isBullet = false;
          const bulletMatch = displayLine.match(/^[-+*]\s+(.*)$/);
          if (bulletMatch) {
            displayLine = "• " + bulletMatch[1];
            isBullet = true;
          }

          // Normal text - xử lý markdown bold (**text**)
          const boldPattern = /\*\*([^*]+)\*\*/g;
          const parts: TextRun[] = [];
          let lastIndex = 0;
          let match;

          while ((match = boldPattern.exec(displayLine)) !== null) {
            // Text trước phần bold
            if (match.index > lastIndex) {
              parts.push(new TextRun({
                text: displayLine.slice(lastIndex, match.index),
                size: 24,
                font: "Times New Roman"
              }));
            }
            // Phần bold
            parts.push(new TextRun({
              text: match[1],
              bold: true,
              size: 24,
              font: "Times New Roman"
            }));
            lastIndex = match.index + match[0].length;
          }

          // Text còn lại sau phần bold cuối cùng
          if (lastIndex < displayLine.length) {
            parts.push(new TextRun({
              text: displayLine.slice(lastIndex).replace(/\*\*/g, ''),
              size: 24,
              font: "Times New Roman"
            }));
          }

          // Nếu không có phần bold nào
          if (parts.length === 0) {
            parts.push(new TextRun({
              text: displayLine.replace(/\*\*/g, ''),
              size: 24,
              font: "Times New Roman"
            }));
          }

          elements.push(new Paragraph({
            children: parts,
            spacing: { after: 100 },
            indent: isBullet ? { left: 360 } : undefined
          }));
        }

        return elements;
      };

      // Hàm tạo dòng credit EDUGENVN (cần tạo instance riêng cho mỗi lần dùng)
      const createCreditParagraph = () => new Paragraph({
        children: [new TextRun({
          text: "Bài tập được tạo thành công từ EDUGENVN - Phát triển bởi thầy Trần Hoài Thanh",
          italics: true,
          size: 22,
          font: "Times New Roman",
          color: "666666"
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 }
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({
                text: "ĐỀ THI - TẠO BỞI TRỢ LÝ EDUGENVN",
                bold: true,
                size: 32,
                font: "Times New Roman"
              })],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            ...createParagraphsFromMarkdown(questionsPart),
            createCreditParagraph(),
            new Paragraph({
              children: [new PageBreak()]
            }),
            new Paragraph({
              children: [new TextRun({
                text: "ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT",
                bold: true,
                size: 32,
                font: "Times New Roman"
              })],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 400 }
            }),
            ...createParagraphsFromMarkdown(answersPart),
            createCreditParagraph()
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `De_Thi_EduGenVN_${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error creating Word document:", error);
      alert("Có lỗi khi tạo file Word. Vui lòng thử lại.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-teal-100 overflow-hidden flex flex-col h-[700px] lg:h-[900px]">
      <div className="bg-teal-50 border-b border-teal-100 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <h3 className="font-bold text-teal-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Nội Dung Đề Thi
        </h3>
        <button
          onClick={handleDownloadWord}
          disabled={isDownloading}
          className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          {isDownloading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang tạo file...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Tải về Word (.docx)
            </>
          )}
        </button>
      </div>

      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden bg-white">
        {/* Column 1: Questions */}
        <div className="flex-1 overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-slate-200 p-6 min-h-[50%] lg:min-h-full">
          <div className="sticky top-0 bg-white/95 backdrop-blur z-10 pb-2 mb-4 border-b border-teal-100">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Đề Bài</span>
          </div>
          <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-teal-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700 prose-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {questionsPart}
            </ReactMarkdown>
          </div>
        </div>

        {/* Column 2: Answers */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-teal-50/30 min-h-[50%] lg:min-h-full">
          <div className="sticky top-0 bg-white/95 backdrop-blur z-10 pb-2 mb-4 border-b border-teal-100">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Đáp Án & Lời Giải</span>
          </div>
          <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-teal-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700 prose-sm">
            {answersPart ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {answersPart}
              </ReactMarkdown>
            ) : (
              <div className="flex items-center justify-center h-40 text-teal-400 italic text-sm">
                Đáp án sẽ hiển thị tại đây sau khi đề bài được tạo xong...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
