import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RulesDialog from '../RulesDialog';

describe('RulesDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<RulesDialog isOpen={true} onClose={mockOnClose} gameMode="ai-guesses" />);
    
    expect(screen.getByText('Rules: AI Guesses Your Game')).toBeInTheDocument();
    expect(screen.getByText('I\'m thinking of a video game, and you\'ll try to guess it.')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<RulesDialog isOpen={false} onClose={mockOnClose} gameMode="ai-guesses" />);
    
    expect(screen.queryByText('Rules: AI Guesses Your Game')).not.toBeInTheDocument();
  });

  it('displays correct rules for AI guesses mode', () => {
    render(<RulesDialog isOpen={true} onClose={mockOnClose} gameMode="ai-guesses" />);
    
    expect(screen.getByText('Rules: AI Guesses Your Game')).toBeInTheDocument();
    expect(screen.getByText('I\'m thinking of a video game, and you\'ll try to guess it.')).toBeInTheDocument();
    expect(screen.getByText('I will ask you up to 20 yes/no questions.')).toBeInTheDocument();
    expect(screen.getByText('You can respond with \'Yes\', \'No\', or \'Unsure\', but no cheating!')).toBeInTheDocument();
    expect(screen.getByText('I\'ll try to guess the game before I run out of questions!')).toBeInTheDocument();
  });

  it('displays correct rules for player guesses mode', () => {
    render(<RulesDialog isOpen={true} onClose={mockOnClose} gameMode="player-guesses" />);
    
    expect(screen.getByText('Rules: You Guess My Game')).toBeInTheDocument();
    expect(screen.getByText('You\'re thinking of a video game, and I\'ll try to guess it.')).toBeInTheDocument();
    expect(screen.getByText('You can ask me up to 20 yes/no questions.')).toBeInTheDocument();
    expect(screen.getByText('I will respond with \'Yes\', \'No\', or \'Unsure\'')).toBeInTheDocument();
    expect(screen.getByText('Try to guess my game before you run out of questions!')).toBeInTheDocument();
  });

  it('calls onClose when Got It button is clicked', () => {
    render(<RulesDialog isOpen={true} onClose={mockOnClose} gameMode="ai-guesses" />);
    
    const gotItButton = screen.getByRole('button', { name: 'Got It!' });
    fireEvent.click(gotItButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders rules as list items', () => {
    render(<RulesDialog isOpen={true} onClose={mockOnClose} gameMode="ai-guesses" />);
    
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(4); // 4 rules for AI guesses mode
  });

  it('has proper modal styling', () => {
    const { container } = render(
      <RulesDialog isOpen={true} onClose={mockOnClose} gameMode="ai-guesses" />
    );
    
    const modal = container.firstChild;
    expect(modal).toHaveClass('fixed', 'inset-0', 'bg-gray-600', 'bg-opacity-50');
  });

  it('has proper dialog buttonstyling', () => {
    render(<RulesDialog isOpen={true} onClose={mockOnClose} gameMode="ai-guesses" />);
    
    const button = screen.getByRole('button', { name: 'Got It!' }).closest('div');
    expect(button).toHaveClass('flex', 'justify-end');
  });
});
