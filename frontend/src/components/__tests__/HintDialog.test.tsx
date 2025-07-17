import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import HintDialog from '../HintDialog';

const mockHints = {
  genre: 'Action',
  platform: 'PC',
  releaseYear: '2023',
  publisher: 'Test Publisher',
  developer: 'Test Developer',
};

describe('HintDialog', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <HintDialog
        isOpen={false}
        onClose={() => {}}
        hints={mockHints}
        onHintClick={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when isOpen is true', () => {
    const { getByText } = render(
      <HintDialog
        isOpen={true}
        onClose={() => {}}
        hints={mockHints}
        onHintClick={() => {}}
      />
    );
    expect(getByText('Need a hint?')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    const { getByText } = render(
      <HintDialog
        isOpen={true}
        onClose={onClose}
        hints={mockHints}
        onHintClick={() => {}}
      />
    );
    fireEvent.click(getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onHintClick with the correct hint when a hint button is clicked', () => {
    const onHintClick = vi.fn();
    const { getByText } = render(
      <HintDialog
        isOpen={true}
        onClose={() => {}}
        hints={mockHints}
        onHintClick={onHintClick}
      />
    );

    fireEvent.click(getByText('Genre'));
    expect(onHintClick).toHaveBeenCalledWith('Action');

    fireEvent.click(getByText('Platform'));
    expect(onHintClick).toHaveBeenCalledWith('PC');
  });
});
