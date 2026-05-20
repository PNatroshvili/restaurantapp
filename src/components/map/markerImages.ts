export type ImageSource = { uri: string };

export const restaurantKey = (label: string, selected: boolean): string =>
  `r|${label}|${selected ? '1' : '0'}`;

export const clusterKey = (count: number): string => `c|${count}`;
