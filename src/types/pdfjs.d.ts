declare module 'pdfjs-dist/build/pdf' {
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  export interface PDFPageProxy {
    getTextContent(): Promise<TextContent>;
  }

  export interface TextContent {
    items: Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
      dir: string;
    }>;
  }

  export interface GetDocumentParams {
    data: Uint8Array;
  }

  export interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }

  export function getDocument(params: GetDocumentParams): PDFDocumentLoadingTask;
  export const version: string;
} 