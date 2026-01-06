export interface LinkItem {
  url: string;
  title: string;
  category: string;
  sender: string;
  description: string;
  visited: boolean;
}

export interface ChatAnalysisResult {
  chatSummary: string;
  links: LinkItem[];
  stats: {
    totalLinks: number;
    topCategory: string;
  };
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}