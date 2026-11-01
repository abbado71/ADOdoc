export interface TopicVersion {
  id: string;
  topicId: string;
  timestamp: string;
  title: string;
  category: string;
  content: string;
  summary?: string;
  savedBy?: string;
  subtitle?: string;
  tags?: string[];
  imageUrl?: string;
  imageCaption?: string;
}

export interface Topic {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt: string;
  createdAt: string;
  googleDriveFileId?: string;
  googleDriveSyncedAt?: string;
  versions?: TopicVersion[];
  subtitle?: string;
  tags?: string[];
  imageUrl?: string;
  imageCaption?: string;
}

export type ViewMode = 'view' | 'edit';

export interface EditorFormatting {
  fontFamily: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  alignment: 'left' | 'center' | 'right' | 'justify';
  textColor: string;
}
