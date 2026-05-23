import { apiClient } from './client';

export interface ApiCollection {
  id: string;
  titleKa: string;
  subtitle?: string;
  emoji: string;
  accent: string;
  bg: string;
  filterType: string;
  filterValue?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ApiHomeSection {
  id: number;
  sectionKey: string;
  titleKa: string;
  isActive: boolean;
  sortOrder: number;
}

export const homeConfigApi = {
  getCollections: () => apiClient.get<ApiCollection[]>('/collections'),
  getHomeSections: () => apiClient.get<ApiHomeSection[]>('/home-config'),
};
