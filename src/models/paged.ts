import { Document } from 'mongoose';

export interface Paged<T extends Document> {
  count: number;
  currentPage: number;
  pages: number;
  totalPages: number;
  totalCount: number;
  data: T[];
}
