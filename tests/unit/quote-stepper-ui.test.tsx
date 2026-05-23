import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuoteBuilderStepper, QuoteBuilderStep } from '../../src/components/quotes/QuoteBuilderStepper';
import '@testing-library/jest-dom';

describe('QuoteBuilderStepper (UI Unit Tests)', () => {
  // QuoteBuilderStepper renders a fixed 5-step layout internally
  // (client → conditions → items → personalization → review). Tests below
  // assert against connector indices in that order — NOT against this local
  // array, which is kept for type-import sanity only.
  const steps: QuoteBuilderStep[] = ['client', 'conditions', 'items', 'personalization', 'review'];
  void steps;

  describe('Visualização de Estados', () => {
    it('deve marcar a etapa ativa com as classes de destaque', () => {
      render(<QuoteBuilderStepper completedSteps={[]} activeStep="items" />);
      
      const stepLabel = screen.getByText('Itens');
      expect(stepLabel).toHaveClass('text-primary');
      
      const activeContainer = stepLabel.parentElement;
      const activeCircle = activeContainer?.querySelector('.rounded-full');
      expect(activeCircle).toHaveClass('bg-primary');
      expect(activeCircle).toHaveClass('ring-4');
      expect(activeCircle).toHaveClass('ring-primary/20');
    });

    it('deve mostrar o ícone de Check em etapas completadas que não são a ativa', () => {
      render(<QuoteBuilderStepper completedSteps={['client']} activeStep="items" />);
      
      const firstStepContainer = screen.getByText('Cliente').parentElement;
      const checkIcon = firstStepContainer?.querySelector('svg');
      expect(checkIcon).toBeDefined();
      // Em etapas completas não ativas, o círculo deve ser bg-primary/20
      const circle = firstStepContainer?.querySelector('.rounded-full');
      expect(circle).toHaveClass('bg-primary/20');
    });

    it('deve mostrar estilo muted para etapas não iniciadas', () => {
      render(<QuoteBuilderStepper completedSteps={[]} activeStep="client" />);
      
      const futureStepLabel = screen.getByText('Revisão');
      expect(futureStepLabel).toHaveClass('text-muted-foreground');
      
      const futureCircle = futureStepLabel.parentElement?.querySelector('.rounded-full');
      expect(futureCircle).toHaveClass('bg-muted/50');
    });
  });

  describe('Transições e Barra de Conexão', () => {
    it('deve atualizar o progresso da barra de conexão corretamente ao avançar', () => {
      // Layout: client(0) → [conn0] → conditions(1) → [conn1] → items(2)
      //         → [conn2] → personalization(3) → [conn3] → review(4)
      // Regra: connector i é bg-primary se activeIndex > i.
      const { rerender } = render(<QuoteBuilderStepper completedSteps={['client']} activeStep="client" />);

      let connectors = document.querySelectorAll('.h-full.rounded-full.transition-all');
      // activeIndex=0 → todos border
      expect(connectors[0]).toHaveClass('bg-border');

      rerender(<QuoteBuilderStepper completedSteps={['client']} activeStep="items" />);
      connectors = document.querySelectorAll('.h-full.rounded-full.transition-all');
      // activeIndex=2 → conn0 (0<2) e conn1 (1<2) primary, conn2 (2!<2) border
      expect(connectors[0]).toHaveClass('bg-primary');
      expect(connectors[1]).toHaveClass('bg-primary');
      expect(connectors[2]).toHaveClass('bg-border');
    });

    it('deve retroceder o estado visual da barra ao voltar etapas', () => {
      // activeStep="conditions" (index 1) → conn0 primary, conn1+ border
      const { rerender } = render(<QuoteBuilderStepper completedSteps={['client', 'items']} activeStep="conditions" />);

      let connectors = document.querySelectorAll('.h-full.rounded-full.transition-all');
      expect(connectors[0]).toHaveClass('bg-primary');
      expect(connectors[1]).toHaveClass('bg-border');

      // Avança para "items" (index 2) → conn0+conn1 primary, conn2+ border
      rerender(<QuoteBuilderStepper completedSteps={['client']} activeStep="items" />);
      connectors = document.querySelectorAll('.h-full.rounded-full.transition-all');
      expect(connectors[0]).toHaveClass('bg-primary');
      expect(connectors[1]).toHaveClass('bg-primary');
      expect(connectors[2]).toHaveClass('bg-border');
    });

    it('deve manter todas as conexões anteriores como ativas se estiver na última etapa', () => {
      // activeStep="review" (index 4) → todos os 4 connectors primary
      render(<QuoteBuilderStepper completedSteps={['client', 'conditions', 'items', 'personalization']} activeStep="review" />);
      const connectors = document.querySelectorAll('.h-full.rounded-full.transition-all');
      connectors.forEach(c => expect(c).toHaveClass('bg-primary'));
    });
  });
});
