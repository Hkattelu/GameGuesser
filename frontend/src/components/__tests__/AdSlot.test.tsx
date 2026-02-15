import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import AdSlot from '../AdSlot';

describe('AdSlot Component', () => {
  beforeEach(() => {
    // Mock global adsbygoogle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).adsbygoogle = {
      push: vi.fn(),
    };

    // Mock requestAnimationFrame
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the AdSense markup with fluid format', () => {
    const { container } = render(<AdSlot format="fluid" placementId="7671409050" adLayout="in-article" />);

    const ins = container.querySelector('ins.adsbygoogle');
    expect(ins).toBeInTheDocument();
    expect(ins).toHaveAttribute('data-ad-slot', '7671409050');
    expect(ins).toHaveAttribute('data-ad-format', 'fluid');
    expect(ins).toHaveAttribute('data-ad-layout', 'in-article');
  });

  it('calls push on mount after delay', () => {
    const { container } = render(<AdSlot format="banner" placementId="1234567890" />);

    // Get the container to mock its width
    const adContainer = container.querySelector('.ad-slot-container') as HTMLElement;
    Object.defineProperty(adContainer, 'offsetWidth', {
      configurable: true,
      value: 320,
    });

    // Fast-forward through requestAnimationFrame and setTimeout
    vi.runAllTimers();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((window as any).adsbygoogle.push).toHaveBeenCalled();
  });

  it('skips ad initialization if container is too narrow', () => {
    const { container } = render(<AdSlot format="banner" placementId="1234567890" />);

    // Mock a very narrow container
    const adContainer = container.querySelector('.ad-slot-container') as HTMLElement;
    Object.defineProperty(adContainer, 'offsetWidth', {
      configurable: true,
      value: 50,
    });

    // Fast-forward through requestAnimationFrame and setTimeout
    vi.runAllTimers();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((window as any).adsbygoogle.push).not.toHaveBeenCalled();
  });
});
