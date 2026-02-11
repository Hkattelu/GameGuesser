import { render, screen, waitFor } from '../test/test-utils';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';

import StartScreen from '../StartScreen';

// Mock AuthPage so we can easily assert its presence.
vi.mock('../AuthPage', () => ({
    default: () => <div data-testid="auth-page">Login</div>,
}));

describe('StartScreen component', () => {
  afterEach(() => {
    // Reset localStorage between tests so state doesn't leak.
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders AuthPage when the user is not authenticated', () => {
    render(
      <MemoryRouter>
        <StartScreen />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('auth-page')).toBeInTheDocument();
  });

  it('renders the game mode picker when the user is authenticated', async () => {
    // Simulate a previously logged-in session.
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('username', 'test-user');

    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          chatHistory: [],
          questionCount: 20,
        }),
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(null),
      }));

    render(
      <MemoryRouter>
        <StartScreen />
      </MemoryRouter>,
    );

    // The heading and option buttons should be visible.
    await waitFor(() => {
      expect(screen.getByText("Quiz Bot's Arcade")).toBeInTheDocument();
      expect(screen.getByText('Quiz Bot guesses')).toBeInTheDocument();
      expect(screen.getByText('You guess')).toBeInTheDocument();
    });
  });

  it('shows indicator if already completed for today but does not disable button', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('username', 'test-user');
    // Mock fetch to return a completed session for ai-guesses, not for player-guesses
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          chatHistory: [
            { role: 'model', content: JSON.stringify({ type: 'guess', content: true }) },
          ],
          questionCount: 20,
        }),
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(null),
      }));

    render(
      <MemoryRouter>
        <StartScreen />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Quiz Bot guesses').closest('button')).not.toBeDisabled();
      expect(screen.getByText('You guess').closest('button')).not.toBeDisabled();
      expect(screen.getAllByText('Already played today')[0]).toBeInTheDocument();
    });
  });
});
