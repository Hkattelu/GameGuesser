import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import HintDialog from '../HintDialog';
import * as env from '../../env_utils';

// Mock the env_utils module
vi.mock('../../env_utils', () => ({
  getApiUrl: vi.fn(),
}));

describe('HintDialog', () => {
  const _mockSetQuestionCount = vi.fn();
  const _mockSetChatHistory = vi.fn();

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
      />
    );
    expect(getByText('Need a hint?')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    const { getByRole } = render(
      <HintDialog
        isOpen={true}
        onClose={onClose}
        sessionId="test-session"
      />
    );
    const closeButton = getByRole('button', { name: '×' });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when revealing a hint', async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ hint: { hintType: 'publisher', hintText: 'Loading Test' } }) }), 100))
    );

    const { getByText } = render(
      <HintDialog
        isOpen={true}
        onClose={() => {}}
        sessionId="test-session"
      />
    );

    const publisherRow = getByText('Publisher').closest('.flex.justify-between.items-center.mb-4');
    if (publisherRow) {
      fireEvent.click(within(publisherRow).getByRole('button', { name: 'Reveal' }));
    }
    expect(within(publisherRow).getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => expect(getByText('Loading Test')).toBeInTheDocument());
  });
});