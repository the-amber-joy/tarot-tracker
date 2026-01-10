export interface ReadingCard {
  card_order: number;
  card_name: string;
  position: string;
  interpretation: string;
  position_x: number | null;
  position_y: number | null;
  rotation: number;
  reversed: boolean;
}

export type ReadingCardsMap = Record<number, ReadingCard>;
