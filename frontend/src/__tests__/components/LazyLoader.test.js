import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LazyLoader from '../../components/Loading/LazyLoader';

describe('LazyLoader Component', () => {
  test('renders loading component', () => {
    render(<LazyLoader />);
    
    // Verifica se o componente está presente
    const loadingContainer = screen.getByText('Carregando...');
    expect(loadingContainer).toBeInTheDocument();
  });

  test('has proper loading text', () => {
    render(<LazyLoader />);
    
    // Verifica se há texto de loading
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  test('has spinning loader animation', () => {
    render(<LazyLoader />);
    
    // Verifica se há um elemento com animação de spinner
    const spinnerElement = document.querySelector('.animate-spin');
    expect(spinnerElement).toBeInTheDocument();
  });

  test('applies correct CSS structure', () => {
    render(<LazyLoader />);
    
    // Verifica se tem a estrutura de classes corretas
    const mainContainer = document.querySelector('.flex.items-center.justify-center.min-h-screen');
    expect(mainContainer).toBeInTheDocument();
    
    const contentContainer = document.querySelector('.flex.flex-col.items-center.space-y-4');
    expect(contentContainer).toBeInTheDocument();
  });

  test('has proper spinner styles', () => {
    render(<LazyLoader />);
    
    // Verifica se o spinner tem as classes corretas
    const spinner = document.querySelector('.w-12.h-12.border-4.border-blue-200.rounded-full.animate-spin.border-t-blue-600');
    expect(spinner).toBeInTheDocument();
  });

  test('displays centered content', () => {
    render(<LazyLoader />);
    
    const textElement = screen.getByText('Carregando...');
    expect(textElement).toHaveClass('text-gray-600', 'text-sm');
  });
});