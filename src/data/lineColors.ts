/** Official TfL line colours (per the Underground/Overground/Elizabeth line brand palette). */
export const LINE_COLORS: Record<string, { name: string; color: string }> = {
  bakerloo: { name: 'Bakerloo', color: '#B36305' },
  central: { name: 'Central', color: '#E32017' },
  circle: { name: 'Circle', color: '#FFD300' },
  district: { name: 'District', color: '#00782A' },
  'hammersmith-city': { name: 'Hammersmith & City', color: '#F3A9BB' },
  jubilee: { name: 'Jubilee', color: '#A0A5A9' },
  metropolitan: { name: 'Metropolitan', color: '#9B0056' },
  northern: { name: 'Northern', color: '#000000' },
  piccadilly: { name: 'Piccadilly', color: '#003688' },
  victoria: { name: 'Victoria', color: '#0098D4' },
  'waterloo-city': { name: 'Waterloo & City', color: '#95CDBA' },
  dlr: { name: 'DLR', color: '#00A4A7' },
  'london-overground': { name: 'Overground', color: '#EE7C0E' },
  elizabeth: { name: 'Elizabeth line', color: '#6950A1' },
};

export function getLineColor(lineId: string): string {
  return LINE_COLORS[lineId]?.color ?? '#888888';
}

export function getLineName(lineId: string): string {
  return LINE_COLORS[lineId]?.name ?? lineId;
}
