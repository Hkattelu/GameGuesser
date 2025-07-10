/**
* @jest-environment jsdom
*/

// jest.mock('src/env_utils.ts');
import { render, fireEvent, screen } from '@testing-library/react';
import ResponseButtons from '../ResponseButtons';

describe('ResponseButtons component', () => {
  it('calls onAnswer callback with correct value when buttons are clicked', () => {
    const onAnswer = jest.fn();
    render(<ResponseButtons onAnswer={onAnswer} highlightedResponse={null} />);

    fireEvent.click(screen.getByText('Yes'));
    expect(onAnswer).toHaveBeenCalledWith('Yes');

    fireEvent.click(screen.getByText('No'));
    expect(onAnswer).toHaveBeenCalledWith('No');

    fireEvent.click(screen.getByText('Unsure'));
    expect(onAnswer).toHaveBeenCalledWith('Unsure');
  });
});
