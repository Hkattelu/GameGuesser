import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameResultsGrid from '../GameResultsGrid';
import { ChatMessage } from '../../types';

describe('GameResultsGrid', () => {
  const mockChatHistory: ChatMessage[] = [
    { role: 'user', parts: [{ text: 'Is it an RPG?' }] },
    { role: 'model', parts: [{ text: 'Yes' }] },
    { role: 'user', parts: [{ text: 'Is it open world?' }] },
    { role: 'model', parts: [{ text: 'No' }] },
    { role: 'user', parts: [{ text: 'Is it a puzzle game?' }] },
    { role: 'model', parts: [{ text: 'Unsure' }] },
    { role: 'user', parts: [{ text: 'Final Fantasy VII' }] },
    { role: 'model', parts: [{ text: 'You guessed it! The game was Final Fantasy VII.' }] },
  ];

  it('renders a 5x4 grid of 20 squares', () => {
    render(
      <GameResultsGrid
        chatHistory={mockChatHistory}
        gameMode="player-guesses"
        victory={true}
        maxQuestions={20}
      />
    );

    // Should have 20 squares
    const squares = screen.getAllByRole('generic').filter(
      (el) => el.textContent && /^\d\d?$/.test(el.textContent)
    );
    expect(squares).toHaveLength(20);
  });

  it('colors squares correctly based on responses', () => {
    const { container } = render(
      <GameResultsGrid
        chatHistory={mockChatHistory}
        gameMode="player-guesses"
        victory={true}
        maxQuestions={20}
      />
    );

    // First square should be green (Yes)
    const firstSquare = container.querySelector('[title*="Q1"]');
    expect(firstSquare).toHaveClass('bg-green-500');

    // Second square should be red (No)
    const secondSquare = container.querySelector('[title*="Q2"]');
    expect(secondSquare).toHaveClass('bg-red-500');

    // Third square should be yellow (Unsure)
    const thirdSquare = container.querySelector('[title*="Q3"]');
    expect(thirdSquare).toHaveClass('bg-yellow-500');

    // Fourth square should be purple (winning guess)
    const fourthSquare = container.querySelector('[title*="Q4"]');
    expect(fourthSquare).toHaveClass('bg-purple-500');
  });

  it('handles empty chat history', () => {
    render(
      <GameResultsGrid
        chatHistory={[]}
        gameMode="player-guesses"
        victory={false}
        maxQuestions={20}
      />
    );

    // All squares should be gray (empty)
    const squares = screen.getAllByRole('generic').filter(
      (el) => el.textContent && /^\d\d?$/.test(el.textContent)
    );
    
    squares.forEach((square, index) => {
      expect(square).toHaveClass('bg-gray-100');
      expect(square).toHaveTextContent((index + 1).toString());
    });
  });

  it('shows tooltips with question content', () => {
    render(
      <GameResultsGrid
        chatHistory={mockChatHistory}
        gameMode="player-guesses"
        victory={true}
        maxQuestions={20}
      />
    );

    const firstSquare = screen.getByTitle('Q1: Is it an RPG?');
    expect(firstSquare).toBeInTheDocument();

    const secondSquare = screen.getByTitle('Q2: Is it open world?');
    expect(secondSquare).toBeInTheDocument();
  });

  it('renders color legend', () => {
    render(
      <GameResultsGrid
        chatHistory={mockChatHistory}
        gameMode="player-guesses"
        victory={true}
        maxQuestions={20}
      />
    );

    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('Unsure')).toBeInTheDocument();
    expect(screen.getByText('Win')).toBeInTheDocument();
  });

  it('handles AI guesses mode differently', () => {
    const aiChatHistory: ChatMessage[] = [
      { role: 'user', parts: [{ text: 'AI Game Started.' }] },
      { role: 'model', parts: [{ text: JSON.stringify({ type: 'question', content: 'Is it an RPG?' }) }] },
      { role: 'user', parts: [{ text: 'User answered: Yes' }] },
      { role: 'model', parts: [{ text: JSON.stringify({ type: 'question', content: 'Is it open world?' }) }] },
    ];

    render(
      <GameResultsGrid
        chatHistory={aiChatHistory}
        gameMode="ai-guesses"
        victory={false}
        maxQuestions={20}
      />
    );

    // Should parse AI guesses mode correctly
    const firstSquare = screen.getByTitle('Q1: User answered: Yes');
    expect(firstSquare).toBeInTheDocument();
  });

  it('handles victory state correctly', () => {
    const { container } = render(
      <GameResultsGrid
        chatHistory={mockChatHistory}
        gameMode="player-guesses"
        victory={false}
        maxQuestions={20}
      />
    );

    // With victory=false, winning guess should be gray
    const winningSquare = container.querySelector('[title*="Final Fantasy VII"]');
    expect(winningSquare).toHaveClass('bg-gray-500');
  });

  it('limits questions to maxQuestions', () => {
    const longChatHistory: ChatMessage[] = [];
    for (let i = 1; i <= 25; i++) {
      longChatHistory.push({ role: 'user', parts: [{ text: `Question ${i}` }] });
      longChatHistory.push({ role: 'model', parts: [{ text: 'Yes' }] });
    }

    render(
      <GameResultsGrid
        chatHistory={longChatHistory}
        gameMode="player-guesses"
        victory={false}
        maxQuestions={20}
      />
    );

    // Should only show 20 questions
    const squares = screen.getAllByRole('generic').filter(
      (el) => el.textContent && /^\d\d?$/.test(el.textContent)
    );
    expect(squares).toHaveLength(20);
  });
});
