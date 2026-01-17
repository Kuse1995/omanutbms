import mammoth from 'mammoth';

export type DocumentType = 'word' | 'pdf' | 'image' | 'unknown';

export interface ParsedDocument {
  text: string;
  type: DocumentType;
  base64?: string;
}

/**
 * Detect the document type based on file extension and MIME type
 */
export function detectFileType(file: File): DocumentType {
  const extension = file.name.toLowerCase().split('.').pop();
  const mimeType = file.type.toLowerCase();

  if (extension === 'docx' || extension === 'doc' || mimeType.includes('word')) {
    return 'word';
  }
  if (extension === 'pdf' || mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension || '') || mimeType.startsWith('image/')) {
    return 'image';
  }
  return 'unknown';
}

/**
 * Read a file and return its content as a base64 string
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Extract text from a Word document (.docx)
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (error) {
        reject(new Error('Failed to extract text from Word document'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse a document and return its content in a format suitable for AI processing
 */
export async function parseDocument(file: File): Promise<ParsedDocument> {
  const type = detectFileType(file);
  
  switch (type) {
    case 'word': {
      const text = await extractTextFromDocx(file);
      return { text, type };
    }
    case 'pdf':
    case 'image': {
      // For PDFs and images, we send the base64 to AI for vision processing
      const base64 = await readFileAsBase64(file);
      return { 
        text: '', 
        type, 
        base64 
      };
    }
    default:
      throw new Error(`Unsupported file type: ${file.type}`);
  }
}

/**
 * Supported file extensions for document conversion
 */
export const SUPPORTED_EXTENSIONS = ['.docx', '.doc', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Accept string for file input
 */
export const DOCUMENT_ACCEPT = '.docx,.doc,.pdf,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Check if a file is supported for document conversion
 */
export function isFileSupported(file: File): boolean {
  const type = detectFileType(file);
  return type !== 'unknown';
}
