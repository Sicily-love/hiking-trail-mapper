export type ContentTone = 'default' | 'muted' | 'success' | 'warning' | 'danger';
export type ContentDialogSize = 'default' | 'wide';

export interface ContentDialogRow {
  label: string;
  value: string;
}

export interface ContentDialogProgress {
  value: number;
  label: string;
}

export interface ContentDialogSection {
  heading?: string;
  meta?: string;
  paragraphs?: string[];
  items?: string[];
  ordered?: boolean;
  rows?: ContentDialogRow[];
  progress?: ContentDialogProgress;
  tone?: ContentTone;
}

export interface ContentDialogAction {
  id: string;
  label: string;
  kind?: 'secondary' | 'primary' | 'danger';
}

export interface ContentDialogOptions {
  title: string;
  message?: string;
  closeLabel: string;
  size?: ContentDialogSize;
  sections: ContentDialogSection[];
  actions?: ContentDialogAction[];
}
