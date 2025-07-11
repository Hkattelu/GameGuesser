import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

    render(
      <MemoryRouter>
        <StartScreen />
      </MemoryRouter>,
    );

    // The heading and option buttons should be visible.
    expect(screen.getByText("Game Boy's Game Guesser")).toBeInTheDocument();
    expect(screen.getByText('Game Boy guesses')).toBeInTheDocument();
    expect(screen.getByText('You guess')).toBeInTheDocument();

    // Ensure clicking a game option starts the transition (adds CSS class).
    const optionButton = screen.getByText('Game Boy guesses');
    fireEvent.click(optionButton);

    await waitFor(() => {
      const root = optionButton.closest('.start-screen');
      expect(root).not.toBeNull();
      // After click the wrapper should have the transitioning class.
      expect(root).toHaveClass('start-screen--transitioning');
    });
  });
});
