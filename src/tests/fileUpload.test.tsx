import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FileUpload from '@/components/FileUpload';

describe('FileUpload Component', () => {
  it('renders the upload button', () => {
    render(<FileUpload />);
    expect(screen.getByText('Upload PDF')).toBeInTheDocument();
  });

  it('accepts PDF files', () => {
    render(<FileUpload />);
    const input = screen.getByLabelText('Upload PDF');
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    
    fireEvent.change(input, { target: { files: [file] } });
    expect(input.files[0]).toBe(file);
  });

  it('rejects non-PDF files', () => {
    render(<FileUpload />);
    const input = screen.getByLabelText('Upload PDF');
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText('Please upload a PDF file')).toBeInTheDocument();
  });

  it('handles file size limit', () => {
    render(<FileUpload />);
    const input = screen.getByLabelText('Upload PDF');
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    
    fireEvent.change(input, { target: { files: [largeFile] } });
    expect(screen.getByText('File size exceeds the limit')).toBeInTheDocument();
  });
}); 