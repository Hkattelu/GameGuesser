import { render, screen } from '@testing-library/react';
import MascotImage from '../MascotImage';

describe.skip('MascotImage', () => {
  it('renders the correct image based on confidence score', () => {
    const { rerender } = render(<MascotImage confidence={1} />);
    expect(screen.getByAltText('Game Boy mascot')).toHaveAttribute('src', '/bot_boy/sad.png');

    rerender(<MascotImage confidence={3} />);
    expect(screen.getByAltText('Game Boy mascot')).toHaveAttribute('src', '/bot_boy/nervous.png');

    rerender(<MascotImage confidence={5} />);
    expect(screen.getByAltText('Game Boy mascot')).toHaveAttribute('src', '/bot_boy/thinking.png');

    rerender(<MascotImage confidence={7} />);
    expect(screen.getByAltText('Game Boy mascot')).toHaveAttribute('src', '/bot_boy/smile.png');

    rerender(<MascotImage confidence={9} />);
    expect(screen.getByAltText('Game Boy mascot')).toHaveAttribute('src', '/bot_boy/smug.png');
  });

  it('renders the correct image based on mood', () => {
    const { rerender } = render(<MascotImage mood="default" />);
    expect(screen.getByAltText('Game Boy mascot')).toHaveAttribute('src', '/bot_boy/smile.png');

    rerender(<MascotImage mood="sad" />);
    expect(screen.getByAltText('Game Boy mascot')).toHaveAttribute('src', '/bot_boy/sad.png');

    rerender(<MascotImage mood="thinking" />);
    expect(screen.getByAltText('Game Boy mascot')).toHaveAttribute('src', '/bot_boy/thinking.png');

    rerender(<MascotImage mood="nervous" />);
    expect(screen.getByAltText('Game Boy mascot')).toHaveAttribute('src', '/bot_boy/nervous.png');

    rerender(<MascotImage mood="smug" />);
    expect(screen.getByAltText('Game Boy mascot')).toHaveAttribute('src', '/bot_boy/smug.png');

    rerender(<MascotImage mood="victory" />);
    expect(screen.getByAltText('Game Boy mascot')).toHaveAttribute('src', '/bot_boy/victory.png');

    rerender(<MascotImage mood="error" />);
    expect(screen.getByAltText('Game Boy mascot')).toHaveAttribute('src', '/bot_boy/error.png');
  });
});
