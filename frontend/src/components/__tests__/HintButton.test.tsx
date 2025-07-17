import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import HintButton from '../HintButton';

describe('HintButton', () => {
  it('renders a button with the text "Hint"', () => {
    const { getByText } = render(<HintButton onClick={() => {}} />);
    expect(getByText('Hint')).toBeInTheDocument();
  });

  it('calls the onClick handler when clicked', () => {
    const onClick = vi.fn();
    const { getByText } = render(<HintButton onClick={onClick} />);
    fireEvent.click(getByText('Hint'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
