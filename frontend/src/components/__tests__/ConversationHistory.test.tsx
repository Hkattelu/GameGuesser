import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConversationHistory from '../ConversationHistory';
import { ChatMessage } from '../../types';

// Prevent React Testing Library from throwing when `scrollIntoView` is called
// during tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window.HTMLElement.prototype as any).scrollIntoView = vi.fn();

describe('ConversationHistory', () => {
  const mockChatHistory: ChatMessage[] = [
    { role: 'model', parts: [{ text: JSON.stringify({ type: 'question', content: 'Does it have a turn-based combat system?' }) }] },
    { role: 'user', parts: [{ text: 'Yes' }] },
    { role: 'model', parts: [{ text: JSON.stringify({ type: 'question', content: 'Is it Final Fantasy VII?' }) }] },
    { role: 'user', parts: [{ text: 'No' }] },
    { role: 'model', parts: [{ text: JSON.stringify({ type: 'question', content: 'Is it Final Fantasy X?' }) }] },
    { role: 'user', parts: [{ text: 'Yes it is' }] },
    { role: 'model', parts: [{ text: JSON.stringify({ type: 'guess', content: true }) }] },
  ];

  const mockPlayerChatHistory: ChatMessage[] = [
    { role: 'user', parts: [{ text: 'Is it an RPG?' }] },
    { role: 'model', parts: [{ text: JSON.stringify({ type: 'answer', content: { answer: 'No', clarification: 'It is not an RPG.' } }) }] },
    { role: 'user', parts: [{ text: 'My guess is Zelda.' }] },
    { role: 'model', parts: [{ text: JSON.stringify({ type: 'guessResult', content: { response: 'That is incorrect.', score: 50, usedHint: true } }) }] },
  ];

  it('renders AI-guesses conversation correctly', () => {
    render(
      <ConversationHistory
        chatHistory={mockChatHistory}
        gameMode="ai-guesses"
        loading={false}
      />,
    );

    // Check table headers
    expect(screen.getByRole('columnheader', { name: 'Quiz Bot' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'You' })).toBeInTheDocument();

    // Check first turn: Model asks, User answers
    expect(screen.getByRole('cell', { name: 'Does it have a turn-based combat system?' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Yes' })).toBeInTheDocument();

    // Check second turn: Model guesses, User answers
    expect(screen.getByRole('cell', { name: 'Is it Final Fantasy VII?' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'No' })).toBeInTheDocument();

    // Check third turn: Model says asks once more, User confirms
    expect(screen.getByRole('cell', { name: 'Is it Final Fantasy X?' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Yes it is' })).toBeInTheDocument();

    // Check fourth turn: Model declares victory
    expect(screen.getByRole('cell', { name: 'Victory!' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '-' })).toBeInTheDocument(); // User says nothing when the model wins.
  });

  it('renders player-guesses conversation correctly', () => {
    render(
      <ConversationHistory
        chatHistory={mockPlayerChatHistory}
        gameMode="player-guesses"
        loading={false}
      />,
    );

    // Check table headers
    expect(screen.getByRole('columnheader', { name: 'You' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Quiz Bot' })).toBeInTheDocument();

    // Check first turn: User asks, Model answers
    expect(screen.getByRole('cell', { name: 'Is it an RPG?' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'No - It is not an RPG.' })).toBeInTheDocument();

    // Check second turn: User guesses, Model gives guessResult
    expect(screen.getByRole('cell', { name: 'My guess is Zelda.' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'That is incorrect. (50 pts) (hint)' })).toBeInTheDocument();
  });

  it('sets the correct id for AI Guesses game mode', () => {
    render(
      <ConversationHistory chatHistory={mockChatHistory} gameMode="ai-guesses" loading={false} />,
    );

    expect(screen.getByRole('table')).toHaveAttribute('id', 'conversation-history');
  });

  it('sets the correct id for Player Guesses game mode', () => {
    render(
      <ConversationHistory
        chatHistory={mockChatHistory}
        gameMode="player-guesses"
        loading={false}
      />,
    );

    expect(screen.getByRole('table')).toHaveAttribute(
      'id',
      'conversation-history-player',
    );
  });

  it('shows loading indicator when loading is true', () => {
    const { container } = render(
      <ConversationHistory chatHistory={[]} gameMode="ai-guesses" loading />,
    );

    expect(container.querySelector('#loading-indicator')).toBeInTheDocument();
  });
});
