import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../Modal/Modal.module.css', () => ({
  default: {
    overlay: 'overlay',
    modal: 'modal',
    header: 'header',
    title: 'title',
    close: 'close',
    body: 'body',
  },
}));

import Modal from '../Modal/Modal';

const onClose = vi.fn();

beforeEach(() => {
  onClose.mockClear();
});

describe('Modal', () => {
  test('renders nothing when open is false', () => {
    render(
      <Modal open={false} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders modal with title and children when open is true', () => {
    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <p>Modal body content</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-label', 'Test Modal');
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal body content')).toBeInTheDocument();
  });

  test('calls onClose when Escape key is pressed', () => {
    render(
      <Modal open={true} onClose={onClose} title="Escape Test">
        <p>Content</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when clicking the overlay, but not the modal content', async () => {
    const user = userEvent.setup();

    render(
      <Modal open={true} onClose={onClose} title="Overlay Test">
        <p>Inner content</p>
      </Modal>,
    );

    // Click on the inner modal content -- should NOT trigger onClose
    await user.click(screen.getByText('Inner content'));
    expect(onClose).not.toHaveBeenCalled();

    // Click on the overlay (the outermost div with className "overlay")
    // The overlay is the parent of the dialog
    const dialog = screen.getByRole('dialog');
    const overlay = dialog.parentElement;
    // fireEvent.click to target the overlay element directly
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Modal open={true} onClose={onClose} title="Close Button Test">
        <p>Content</p>
      </Modal>,
    );

    const closeButton = screen.getByRole('button', { name: 'Close' });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
