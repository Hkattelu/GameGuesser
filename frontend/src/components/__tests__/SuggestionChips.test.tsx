import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SuggestionChips from '../SuggestionChips';

describe('SuggestionChips', () => {
  const mockSuggestions = [
    'Is it an RPG?',
    'Is it a first-person shooter?',
    'Was it released before 2010?',
    'Does it have multiplayer?',
  ];

  const mockOnSelectSuggestion = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all suggestion chips', () => {
    render(
      <SuggestionChips 
        suggestions={mockSuggestions} 
        onSelectSuggestion={mockOnSelectSuggestion} 
      />
    );

    mockSuggestions.forEach(suggestion => {
      expect(screen.getByRole('button', { name: suggestion })).toBeInTheDocument();
    });
  });

  it('calls onSelectSuggestion when a chip is clicked', () => {
    render(
      <SuggestionChips 
        suggestions={mockSuggestions} 
        onSelectSuggestion={mockOnSelectSuggestion} 
      />
    );

    const firstChip = screen.getByRole('button', { name: mockSuggestions[0] });
    fireEvent.click(firstChip);

    expect(mockOnSelectSuggestion).toHaveBeenCalledTimes(1);
    expect(mockOnSelectSuggestion).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('renders empty container when no suggestions', () => {
    const { container } = render(
      <SuggestionChips 
        suggestions={[]} 
        onSelectSuggestion={mockOnSelectSuggestion} 
      />
    );

    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('applies correct styling to chips', () => {
    render(
      <SuggestionChips 
        suggestions={mockSuggestions} 
        onSelectSuggestion={mockOnSelectSuggestion} 
      />
    );

    const firstChip = screen.getByRole('button', { name: mockSuggestions[0] });
    expect(firstChip).toHaveClass('suggestion-chip');
  });

  it('handles single suggestion', () => {
    const singleSuggestion = ['Is it an RPG?'];
    
    render(
      <SuggestionChips 
        suggestions={singleSuggestion} 
        onSelectSuggestion={mockOnSelectSuggestion} 
      />
    );

    expect(screen.getByRole('button', { name: singleSuggestion[0] })).toBeInTheDocument();
  });

  it('handles many suggestions', () => {
    const manySuggestions = Array.from({ length: 10 }, (_, i) => `Question ${i + 1}?`);
    
    render(
      <SuggestionChips 
        suggestions={manySuggestions} 
        onSelectSuggestion={mockOnSelectSuggestion} 
      />
    );

    manySuggestions.forEach(suggestion => {
      expect(screen.getByRole('button', { name: suggestion })).toBeInTheDocument();
    });
  });

  it('properly wraps chips in flex container', () => {
    const { container } = render(
      <SuggestionChips 
        suggestions={mockSuggestions} 
        onSelectSuggestion={mockOnSelectSuggestion} 
      />
    );

    const chipContainer = container.firstChild;
    expect(chipContainer).toHaveClass('flex', 'flex-wrap', 'justify-center', 'gap-2', 'mb-4');
  });

  it('calls onSelectSuggestion with correct suggestion for multiple chips', () => {
    render(
      <SuggestionChips 
        suggestions={mockSuggestions} 
        onSelectSuggestion={mockOnSelectSuggestion} 
      />
    );

    // Click different chips
    fireEvent.click(screen.getByRole('button', { name: mockSuggestions[1] }));
    fireEvent.click(screen.getByRole('button', { name: mockSuggestions[3] }));

    expect(mockOnSelectSuggestion).toHaveBeenCalledTimes(2);
    expect(mockOnSelectSuggestion).toHaveBeenNthCalledWith(1, mockSuggestions[1]);
    expect(mockOnSelectSuggestion).toHaveBeenNthCalledWith(2, mockSuggestions[3]);
  });

  it('handles suggestions with special characters', () => {
    const specialSuggestions = [
      'Is it "fantasy" themed?',
      'Does it have co-op & multiplayer?',
      'Was it made in the 90\'s?',
    ];

    render(
      <SuggestionChips 
        suggestions={specialSuggestions} 
        onSelectSuggestion={mockOnSelectSuggestion} 
      />
    );

    specialSuggestions.forEach(suggestion => {
      const chip = screen.getByRole('button', { name: suggestion });
      expect(chip).toBeInTheDocument();
      fireEvent.click(chip);
    });

    expect(mockOnSelectSuggestion).toHaveBeenCalledTimes(3);
    specialSuggestions.forEach((suggestion, index) => {
      expect(mockOnSelectSuggestion).toHaveBeenNthCalledWith(index + 1, suggestion);
    });
  });
});
