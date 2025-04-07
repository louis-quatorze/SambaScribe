import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';

vi.mock('next-auth/react', () => ({
  useSession: vi.fn().mockReturnValue({
    data: null,
    status: 'unauthenticated'
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

describe('Test Setup', () => {
  it('should render a basic component', () => {
    render(<div>Test Component</div>);
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('should mock next-auth session', () => {
    const session = (useSession as any)();
    expect(session.status).toBe('unauthenticated');
    expect(session.data).toBeNull();
  });
}); 