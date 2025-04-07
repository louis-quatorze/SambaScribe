import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { signIn, signOut, useSession } from 'next-auth/react';
import AuthButton from '@/components/AuthButton';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  useSession: vi.fn()
}));

describe('Authentication', () => {
  it('renders sign in button when not authenticated', () => {
    (useSession as any).mockReturnValue({ data: null, status: 'unauthenticated' });
    render(<AuthButton />);
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('renders sign out button when authenticated', () => {
    (useSession as any).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated'
    });
    render(<AuthButton />);
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('calls signIn when sign in button is clicked', () => {
    (useSession as any).mockReturnValue({ data: null, status: 'unauthenticated' });
    render(<AuthButton />);
    fireEvent.click(screen.getByText('Sign in'));
    expect(signIn).toHaveBeenCalled();
  });

  it('calls signOut when sign out button is clicked', () => {
    (useSession as any).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated'
    });
    render(<AuthButton />);
    fireEvent.click(screen.getByText('Sign out'));
    expect(signOut).toHaveBeenCalled();
  });
}); 