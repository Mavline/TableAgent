import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});

test('renders TableChatGPT component', () => {
  render(<App />);
  const appElement = screen.getByTestId('table-chat-container');
  expect(appElement).toBeInTheDocument();
});
