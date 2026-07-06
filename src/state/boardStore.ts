import { create } from 'zustand';

export interface SelectedStation {
  id: string;
  name: string;
}

interface BoardState {
  selectedStation: SelectedStation | null;
  setSelectedStation: (station: SelectedStation) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  selectedStation: null,
  setSelectedStation: (station) => set({ selectedStation: station }),
}));
