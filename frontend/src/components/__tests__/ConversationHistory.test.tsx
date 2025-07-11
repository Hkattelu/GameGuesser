import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConversationHistory from '../ConversationHistory';
import { ChatMessage } from '../../types';

window.HTMLElement.prototype.scrollIntoView = jest.fn()

describe('ConversationHistory', () => {
  const mockChatHistory: ChatMessage[] = [
    { role: 'user', parts: [{ text: 'Is it an RPG?' }] },
    { role: 'model', parts: [{ text: JSON.stringify({ type: 'question', content: 'Does it have a turn-based combat system?' }) }] },
    { role: 'user', parts: [{ text: 'Yes' }] },
    { role: 'model', parts: [{ text: JSON.stringify({ type: 'guess', content: 'Final Fantasy VII' }) }] },
    { role: 'model', parts: [{ text: 'You win!' }] },
    { role: 'model', parts: [{ text: JSON.stringify({ type: 'answer', content: 'No' }) }] },
    { role: 'model', parts: [{ text: JSON.stringify({ type: 'guessResult', content: { response: 'That is incorrect.' } }) }] },
  ];

  it('renders user messages correctly', () => {
    render(<ConversationHistory chatHistory={mockChatHistory} gameMode={'ai-guesses'} />);
    expect(screen.getByText('You: Is it an RPG?')).toBeInTheDocument();
    expect(screen.getByText('You: Yes')).toBeInTheDocument();
  });

  it('renders model question messages correctly', () => {
    render(<ConversationHistory chatHistory={mockChatHistory} gameMode={'ai-guesses'} />);
    expect(screen.getByText('Bot Boy: Does it have a turn-based combat system?')).toBeInTheDocument();
  });

  it('renders model guess messages correctly', () => {
    render(<ConversationHistory chatHistory={mockChatHistory} gameMode={'ai-guesses'} />);
    expect(screen.getByText('Bot Boy (Guess): Final Fantasy VII')).toBeInTheDocument();
  });

  it('renders plain text model messages correctly', () => {
    render(<ConversationHistory chatHistory={mockChatHistory} gameMode={'ai-guesses'} />);
    expect(screen.getByText('Bot Boy: You win!')).toBeInTheDocument();
  });

  it('renders model answer messages correctly', () => {
    render(<ConversationHistory chatHistory={mockChatHistory} gameMode={'player-guesses'} />);
    expect(screen.getByText('Bot Boy: No')).toBeInTheDocument();
  });

  it('renders model guessResult messages correctly', () => {
    render(<ConversationHistory chatHistory={mockChatHistory} gameMode={'player-guesses'} />);
    expect(screen.getByText('Bot Boy: That is incorrect.')).toBeInTheDocument();
  });

  it('sets the correct id for AI Guesses game mode', () => {
    const { container } = render(<ConversationHistory chatHistory={[]} gameMode={'ai-guesses'} />);
    expect(container.firstChild).toHaveAttribute('id', 'conversation-history');
  });

  it('sets the correct id for Player Guesses game mode', () => {
    const { container } = render(<ConversationHistory chatHistory={[]} gameMode={'player-guesses'} />);
    expect(container.firstChild).toHaveAttribute('id', 'conversation-history-player');
  });
});
