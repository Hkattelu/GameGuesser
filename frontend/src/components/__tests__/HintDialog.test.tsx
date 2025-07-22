import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import HintDialog from '../HintDialog';
import * as env from '../../env_utils';

// Mock the env_utils module
vi.mock('../../env_utils', () => ({
  getApiUrl: vi.fn(),
}));

describe('HintDialog', () => {
  const mockSetQuestionCount = vi.fn();
  const mockSetChatHistory = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (env.getApiUrl as jest.Mock).mockReturnValue('http://localhost:3000');
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <HintDialog
        isOpen={false}
        onClose={() => {}}
        sessionId="test-session"
        setQuestionCount={mockSetQuestionCount}
        setChatHistory={mockSetChatHistory}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when isOpen is true', () => {
    const { getByText } = render(
      <HintDialog
        isOpen={true}
        onClose={() => {}}
        sessionId="test-session"
        setQuestionCount={mockSetQuestionCount}
        setChatHistory={mockSetChatHistory}
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
        sessionId="test-session"
        setQuestionCount={mockSetQuestionCount}
        setChatHistory={mockSetChatHistory}
      />
    );
    fireEvent.click(getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fetches and displays a hint when "Reveal Hint" is clicked', async () => {
    const mockHint = { hintText: 'This is a test hint' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHint),
    });

    const { getByText } = render(
      <HintDialog
        isOpen={true}
        onClose={() => {}}
        sessionId="test-session"
        setQuestionCount={mockSetQuestionCount}
        setChatHistory={mockSetChatHistory}
      />
    );

    fireEvent.click(getByText('Reveal Hint'));

    await waitFor(() => {
      expect(getByText(mockHint.hintText)).toBeInTheDocument();
    });

    expect(mockSetQuestionCount).toHaveBeenCalledTimes(1);
    expect(mockSetChatHistory).toHaveBeenCalledTimes(1);
  });
});