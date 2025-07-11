import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';

import App from './App';

// Stub heavy child components so the test focuses on the logout logic.
jest.mock('./AIGuessesGame', () => () => <div data-testid="ai-game" />);
jest.mock('./PlayerGuessesGame', () => () => <div data-testid="player-game" />);
jest.mock('./components/MascotImage', () => () => <div data-testid="mascot" />);
jest.mock('./AuthPage', () => () => <div>AuthPage</div>);

// Silence fetch requests triggered by useEffect in <App />
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve([]),
}) as jest.Mock;

describe('App – logout flow', () => {
  const originalLocalStorage = { ...localStorage } as Storage;

  beforeEach(() => {
    jest.clearAllMocks();
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
    const onNavigateHome = jest.fn();

    render(
      <BrowserRouter>
        <App hideTabs onNavigateHome={onNavigateHome} />
      </BrowserRouter>,
    );

    // The logout button should be rendered because the component sees a token.
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(onNavigateHome).toHaveBeenCalledTimes(1);
    // The token should be removed from localStorage as part of logout.
    expect(localStorage.getItem('token')).toBeNull();
  });
});
