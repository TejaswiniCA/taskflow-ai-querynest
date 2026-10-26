import pdf from 'pdf-parse';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

interface PdfPageData {
  pageIndex: number;
  getTextContent(): Promise<{ items: Array<{ str?: string }> }>;
}

/**
 * Extracts text page-by-page from a PDF or TXT buffer.
 */
export async function extractTextPerPage(
  buffer: Buffer,
  fileType: 'pdf' | 'txt'
): Promise<ExtractedPage[]> {
  if (fileType === 'txt') {
    const fullText = buffer.toString('utf-8');
    // If TXT has form-feed characters (\f), split on them
    if (fullText.includes('\f')) {
      return fullText
        .split('\f')
        .map((text, idx) => ({ pageNumber: idx + 1, text: text.trim() }))
        .filter(p => p.text.length > 0);
    }

    // Otherwise split into logical pages of ~500 words (~2800 characters)
    const paragraphs = fullText.split(/\n\s*\n/);
    const pages: ExtractedPage[] = [];
    let currentPageText = '';
    let currentPageNum = 1;

    for (const paragraph of paragraphs) {
      if (currentPageText.length + paragraph.length > 2800 && currentPageText.length > 0) {
        pages.push({ pageNumber: currentPageNum, text: currentPageText.trim() });
        currentPageNum++;
        currentPageText = paragraph + '\n\n';
      } else {
        currentPageText += paragraph + '\n\n';
      }
    }

    if (currentPageText.trim().length > 0) {
      pages.push({ pageNumber: currentPageNum, text: currentPageText.trim() });
    }

    return pages.length > 0 ? pages : [{ pageNumber: 1, text: fullText.trim() }];
  }

  // PDF extraction with exact page tracking
  const pages: ExtractedPage[] = [];

  const pdfParser = typeof pdf === 'function' ? pdf : (pdf as unknown as { default: typeof pdf }).default;

  const options = {
    pagerender: async function (pageData: PdfPageData) {
      const textContent = await pageData.getTextContent();
      const pageText = textContent.items
        .map(item => item.str ?? '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (pageText.length > 0) {
        pages.push({
          pageNumber: pageData.pageIndex + 1,
          text: pageText,
        });
      }
      return pageText;
    },
  };

  try {
    const data = await pdfParser(buffer, options);

    // Fallback if pagerender didn't collect pages
    if (pages.length === 0 && data.text) {
      const text = data.text.trim();
      const splitByFormFeed = text.split('\f').filter(t => t.trim().length > 0);
      if (splitByFormFeed.length > 1) {
        return splitByFormFeed.map((t: string, idx: number) => ({
          pageNumber: idx + 1,
          text: t.trim(),
        }));
      }
      return [{ pageNumber: 1, text }];
    }

    // Sort by pageNumber ascending
    pages.sort((a, b) => a.pageNumber - b.pageNumber);
    return pages;
  } catch {
    throw new Error('Failed to parse PDF document.');
  }
}
