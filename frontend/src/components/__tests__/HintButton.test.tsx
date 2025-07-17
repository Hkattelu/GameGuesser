import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import HintButton from '../HintButton';

describe('HintButton', () => {
  it('renders a button with the text "Hint"', () => {
    render(<HintButton />);
    expect(screen.getByText('Hint')).toBeInTheDocument();
  });

  it('opens the TextDialog when clicked', () => {
    render(<HintButton />);
    fireEvent.click(screen.getByText('Hint'));
    expect(screen.getByText('How Hints Work')).toBeInTheDocument();
    expect(screen.getByText('Hints can be revealed after every 4 questions you ask.')).toBeInTheDocument();
  });

  it('closes the TextDialog when the close button is clicked', () => {
    render(<HintButton />);
    fireEvent.click(screen.getByText('Hint'));
    expect(screen.getByText('How Hints Work')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByText('How Hints Work')).not.toBeInTheDocument();
  });
});