import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';

import App from '../App';

// Stub heavy child components so the test focuses on the logout logic.
vi.mock('../AIGuessesGame', () => ({
    default: () => <div data-testid="ai-game" />,
}));
vi.mock('../PlayerGuessesGame', () => ({
    default: () => <div data-testid="player-game" />,
}));
vi.mock('../components/MascotImage', () => ({
    default: () => <div data-testid="mascot" />,
}));
vi.mock('../AuthPage', () => ({
    default: () => <div>AuthPage</div>,
}));

// Silence fetch requests triggered by useEffect in <App />
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve([]),
}) as vi.Mock;

describe('App – logout flow', () => {
  const originalLocalStorage = { ...localStorage } as Storage;

  beforeEach(() => {
    vi.clearAllMocks();
    // Prime localStorage so the component thinks the user is logged-in.
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('username', 'test-user');
  });

  afterEach(() => {
    // Clean up any changes to localStorage between tests.
    localStorage.clear();
    Object.keys(originalLocalStorage).forEach((key) => {
      if (originalLocalStorage.getItem(key)) {
        localStorage.setItem(key, originalLocalStorage.getItem(key)!);
      }
    });
  });

  it('calls the onNavigateHome callback when provided', () => {
    const onNavigateHome = vi.fn();

    render(
      <MemoryRouter initialEntries={['/ai-guesses']}>
        <App onNavigateHome={onNavigateHome} />
      </MemoryRouter>,
    );

    // The logout button should be rendered because the component sees a token.
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(onNavigateHome).toHaveBeenCalledTimes(1);
    // The token should be removed from localStorage as part of logout.
    expect(localStorage.getItem('token')).toBeNull();
  });
});

