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
          text: JSON.stringify({ type: 'answer', content: { answer: 'No' } }),
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

    expect(screen.getByRole('cell', { name: 'Is it an RPG?' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Yes' })).toBeInTheDocument();
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
      screen.getByRole('cell', { name: 'Does it have a turn-based combat system?' }),
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
      screen.getByRole('cell', { name: '(Guess): Final Fantasy VII' }),
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

    expect(screen.getByRole('cell', { name: 'You win!' })).toBeInTheDocument();
  });

  it('renders model answer messages correctly', () => {
    const answerChatHistory: ChatMessage[] = [
      { role: 'user', parts: [{ text: 'What is the answer?' }] },
      {
        role: 'model',
        parts: [
          {
            text: JSON.stringify({ type: 'answer', content: { answer: 'No', clarification: 'It is not an RPG.' } }),
          },
        ],
      },
    ];
    render(
      <ConversationHistory
        chatHistory={answerChatHistory}
        gameMode="player-guesses"
        loading={false}
      />,
    );

    expect(screen.getByRole('cell', { name: 'No - It is not an RPG.' })).toBeInTheDocument();
  });

  it('renders model guessResult messages correctly', () => {
    const guessResultChatHistory: ChatMessage[] = [
      { role: 'user', parts: [{ text: 'My guess is Zelda.' }] },
      {
        role: 'model',
        parts: [
          {
            text: JSON.stringify({
              type: 'guessResult',
              content: { response: 'That is incorrect.', score: 50, usedHint: true },
            }),
          },
        ],
      },
    ];
    render(
      <ConversationHistory
        chatHistory={guessResultChatHistory}
        gameMode="player-guesses"
        loading={false}
      />,
    );

    expect(
      screen.getByRole('cell', { name: 'That is incorrect. (50 pts) (hint)' }),
    ).toBeInTheDocument();
  });

  it('renders model guessResult messages correctly without score or hint', () => {
    const guessResultChatHistory: ChatMessage[] = [
      { role: 'user', parts: [{ text: 'My guess is Mario.' }] },
      {
        role: 'model',
        parts: [
          {
            text: JSON.stringify({
              type: 'guessResult',
              content: { response: 'That is correct.' },
            }),
          },
        ],
      },
    ];
    render(
      <ConversationHistory
        chatHistory={guessResultChatHistory}
        gameMode="player-guesses"
        loading={false}
      />,
    );

    expect(
      screen.getByRole('cell', { name: 'That is correct.' }),
    ).toBeInTheDocument();
  });

  it('renders model guessResult messages correctly with score but no hint', () => {
    const guessResultChatHistory: ChatMessage[] = [
      { role: 'user', parts: [{ text: 'My guess is Pokemon.' }] },
      {
        role: 'model',
        parts: [
          {
            text: JSON.stringify({
              type: 'guessResult',
              content: { response: 'That is correct.', score: 100 },
            }),
          },
        ],
      },
    ];
    render(
      <ConversationHistory
        chatHistory={guessResultChatHistory}
        gameMode="player-guesses"
        loading={false}
      />,
    );

    expect(
      screen.getByRole('cell', { name: 'That is correct. (100 pts)' }),
    ).toBeInTheDocument();
  });

  it('renders model guessResult messages correctly with hint but no score', () => {
    const guessResultChatHistory: ChatMessage[] = [
      { role: 'user', parts: [{ text: 'My guess is Tetris.' }] },
      {
        role: 'model',
        parts: [
          {
            text: JSON.stringify({
              type: 'guessResult',
              content: { response: 'That is incorrect.', usedHint: true },
            }),
          },
        ],
      },
    ];
    render(
      <ConversationHistory
        chatHistory={guessResultChatHistory}
        gameMode="player-guesses"
        loading={false}
      />,
    );

    expect(
      screen.getByRole('cell', { name: 'That is incorrect.(hint)' }),
    ).toBeInTheDocument();
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
