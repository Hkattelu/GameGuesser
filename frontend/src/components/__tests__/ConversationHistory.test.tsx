import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConversationHistory from '../ConversationHistory';
import { ChatMessage } from '../../types';

// Prevent React Testing Library from throwing when `scrollIntoView` is called
// during tests.
(window.HTMLElement.prototype as any).scrollIntoView = vi.fn();

describe('ConversationHistory', () => {
  const mockChatHistory: ChatMessage[] = [
    { role: 'user', parts: [{ text: 'Is it an RPG?' }] },
    {
      role: 'model',
      parts: [
        {
          text: JSON.stringify({
            type: 'question',
            content: 'Does it have a turn-based combat system?',
          }),
        },
      ],
    },
    { role: 'user', parts: [{ text: 'Yes' }] },
    {
      role: 'model',
      parts: [
        {
          text: JSON.stringify({ type: 'guess', content: 'Final Fantasy VII' }),
        },
      ],
    },
    { role: 'model', parts: [{ text: 'You win!' }] },
    {
      role: 'model',
      parts: [
        {
          text: JSON.stringify({ type: 'answer', content: 'No' }),
        },
      ],
    },
    {
      role: 'model',
      parts: [
        {
          text: JSON.stringify({
            type: 'guessResult',
            content: { response: 'That is incorrect.' },
          }),
        },
      ],
    },
  ];

  it('renders user messages correctly', () => {
    render(
      <ConversationHistory
        chatHistory={mockChatHistory}
        gameMode="ai-guesses"
        loading={false}
      />,
    );

    expect(screen.getByText('You: Is it an RPG?')).toBeInTheDocument();
    expect(screen.getByText('You: Yes')).toBeInTheDocument();
  });

  it('renders model question messages correctly', () => {
    render(
      <ConversationHistory
        chatHistory={mockChatHistory}
        gameMode="ai-guesses"
        loading={false}
      />,
    );

    expect(
      screen.getByText('Quiz Bot: Does it have a turn-based combat system?'),
    ).toBeInTheDocument();
  });

  it('renders model guess messages correctly', () => {
    render(
      <ConversationHistory
        chatHistory={mockChatHistory}
        gameMode="ai-guesses"
        loading={false}
      />,
    );

    expect(
      screen.getByText('Quiz Bot (Guess): Final Fantasy VII'),
    ).toBeInTheDocument();
  });

  it('renders plain text model messages correctly', () => {
    render(
      <ConversationHistory
        chatHistory={mockChatHistory}
        gameMode="ai-guesses"
        loading={false}
      />,
    );

    expect(screen.getByText('Quiz Bot: You win!')).toBeInTheDocument();
  });

  it('renders model answer messages correctly', () => {
    render(
      <ConversationHistory
        chatHistory={mockChatHistory}
        gameMode="player-guesses"
        loading={false}
      />,
    );

    expect(screen.getByText('Quiz Bot: No')).toBeInTheDocument();
  });

  it('renders model guessResult messages correctly', () => {
    render(
      <ConversationHistory
        chatHistory={mockChatHistory}
        gameMode="player-guesses"
        loading={false}
      />,
    );

    expect(
      screen.getByText('Quiz Bot: That is incorrect.'),
    ).toBeInTheDocument();
  });

  it('sets the correct id for AI Guesses game mode', () => {
    const { container } = render(
      <ConversationHistory chatHistory={[]} gameMode="ai-guesses" loading={false} />,
    );

    expect(container.firstChild).toHaveAttribute('id', 'conversation-history');
  });

  it('sets the correct id for Player Guesses game mode', () => {
    const { container } = render(
      <ConversationHistory
        chatHistory={[]}
        gameMode="player-guesses"
        loading={false}
      />,
    );

    expect(container.firstChild).toHaveAttribute(
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
