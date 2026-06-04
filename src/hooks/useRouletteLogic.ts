import type { Premio } from '../services/supabase';

export function useRouletteLogic() {
  /**
   * Sorteia um prêmio baseado no peso de cada item.
   * Prêmios com peso maior (ex: 100) têm mais chances do que prêmios com peso menor (ex: 5).
   * Itens com estoque 0 devem ser filtrados antes de chamar esta função.
   */
  const drawPrize = (availablePrizes: Premio[]): Premio | null => {
    if (!availablePrizes || availablePrizes.length === 0) return null;

    // Calcula a soma total dos pesos
    const totalWeight = availablePrizes.reduce((sum, prize) => sum + prize.peso, 0);

    // Sorteia um número entre 0 e totalWeight
    let randomNum = Math.random() * totalWeight;

    // Encontra em qual fatia o número sorteado caiu
    for (const prize of availablePrizes) {
      if (randomNum < prize.peso) {
        return prize;
      }
      randomNum -= prize.peso;
    }

    // Fallback de segurança (teoricamente nunca deve chegar aqui se a matemática flutuante for perfeita)
    return availablePrizes[availablePrizes.length - 1];
  };

  /**
   * Converte valor monetário em número de giros.
   * Regra: R$ 10,00 = 1 giro.
   */
  const calculateSpins = (amount: number): number => {
    return Math.floor(amount / 10);
  };

  return {
    drawPrize,
    calculateSpins,
  };
}
