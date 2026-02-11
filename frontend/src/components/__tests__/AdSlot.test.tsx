import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import AdSlot from '../AdSlot';

describe('AdSlot Component', () => {
  beforeEach(() => {
    // Mock global adsbygoogle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).adsbygoogle = {
      push: vi.fn(),
    };
  });

  it('renders the AdSense markup with fluid format', () => {
    const { container } = render(<AdSlot format="fluid" placementId="7671409050" adLayout="in-article" />);

    const ins = container.querySelector('ins.adsbygoogle');
    expect(ins).toBeInTheDocument();
    expect(ins).toHaveAttribute('data-ad-slot', '7671409050');
    expect(ins).toHaveAttribute('data-ad-format', 'fluid');
    expect(ins).toHaveAttribute('data-ad-layout', 'in-article');
  });

  it('calls push on mount', () => {
    render(<AdSlot format="banner" placementId="1234567890" />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((window as any).adsbygoogle.push).toHaveBeenCalled();
  });
});
