import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HighlightMatch } from '@/components/search/HighlightMatch';

describe('HighlightMatch', () => {
  describe('Renderização básica', () => {
    it('renderiza texto sem query', () => {
      render(<HighlightMatch text="Caneta Esferográfica" query="" />);
      expect(screen.getByText('Caneta Esferográfica')).toBeInTheDocument();
    });

    it('renderiza texto com query curta (< 2 chars) sem highlight', () => {
      render(<HighlightMatch text="Caneta" query="C" />);
      expect(screen.getByText('Caneta')).toBeInTheDocument();
      expect(screen.queryByRole('mark')).toBeNull();
    });

    it('aplica highlight em match exato', () => {
      const { container } = render(
        <HighlightMatch text="Caneta Esferográfica Touch" query="caneta" />
      );
      const marks = container.querySelectorAll('mark');
      expect(marks.length).toBe(1);
      expect(marks[0].textContent).toBe('Caneta');
    });

    it('aplica highlight case-insensitive', () => {
      const { container } = render(
        <HighlightMatch text="CANETA AZUL" query="caneta" />
      );
      const marks = container.querySelectorAll('mark');
      expect(marks.length).toBe(1);
      expect(marks[0].textContent).toBe('CANETA');
    });

    it('aplica highlight em múltiplas palavras da query', () => {
      const { container } = render(
        <HighlightMatch text="Caneta Esferográfica Azul" query="caneta azul" />
      );
      const marks = container.querySelectorAll('mark');
      expect(marks.length).toBe(2);
      expect(marks[0].textContent).toBe('Caneta');
      expect(marks[1].textContent).toBe('Azul');
    });

    it('aplica highlight em múltiplas ocorrências da mesma palavra', () => {
      const { container } = render(
        <HighlightMatch text="Caneta com caneta extra" query="caneta" />
      );
      const marks = container.querySelectorAll('mark');
      expect(marks.length).toBe(2);
    });

    it('não quebra com caracteres especiais na query', () => {
      const { container } = render(
        <HighlightMatch text="Preço: R$10.00 (desconto)" query="R$10" />
      );
      // Should not throw
      expect(container).toBeTruthy();
    });

    it('usa className customizada', () => {
      const { container } = render(
        <HighlightMatch text="Teste" query="" className="my-custom-class" />
      );
      expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
    });

    it('usa highlightClassName customizada', () => {
      const { container } = render(
        <HighlightMatch
          text="Caneta Azul"
          query="caneta"
          highlightClassName="custom-highlight"
        />
      );
      const mark = container.querySelector('mark');
      expect(mark?.className).toContain('custom-highlight');
    });

    it('renderiza null-safe quando text é vazio', () => {
      render(<HighlightMatch text="" query="test" />);
      // Should not throw
    });

    it('ignora palavras da query menores que 2 caracteres', () => {
      const { container } = render(
        <HighlightMatch text="A caneta é boa" query="a caneta" />
      );
      const marks = container.querySelectorAll('mark');
      // Only "caneta" should be highlighted, not "A" (1 char)
      expect(marks.length).toBe(1);
      expect(marks[0].textContent).toBe('caneta');
    });
  });
});
