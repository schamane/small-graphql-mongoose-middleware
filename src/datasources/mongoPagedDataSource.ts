import { Document, Model } from 'mongoose';
import { ceil } from 'lodash';
import { Paged } from '../models/paged';
import { MongoDataSource } from '.';
import { GrapqhContext } from '..';
import { Filter, QueryFieldsType, Sorter } from './mongo/filter';

const PER_PAGE = 10;

export abstract class MongoPagedDataSource<T extends Document, TContext extends GrapqhContext> extends MongoDataSource<T, TContext> {
  constructor(entity: Model<T>, fieldTranslations: QueryFieldsType, exts?: unknown[]) {
    super(entity, fieldTranslations, exts);
    this.setLimit(PER_PAGE);
  }

  public async listPaged(sort?: Sorter, pages?: number): Promise<Paged<T>> {
    if (pages && pages > 1) {
      this.setLimit(PER_PAGE * pages);
    }
    const all = (await this.list(sort)) as T[];
    const totalCount = await this.Entity.countDocuments();
    const count = all.length;
    const totalPages = ceil(totalCount / PER_PAGE);
    if (pages && pages > 1) {
      this.setLimit(PER_PAGE);
    }
    return {
      count,
      totalCount,
      currentPage: 0,
      pages: pages || 1,
      totalPages,
      data: all
    };
  }

  public async filterPaged(filters?: Filter[], sort?: Sorter, pages?: number): Promise<Paged<T>> {
    if (pages && pages > 1) {
      this.setLimit(PER_PAGE * pages);
    }
    const all = (await this.filter(filters, sort)) as T[];
    const totalCount = await this.Entity.countDocuments();
    const queryCount = await this.count(filters);
    const count = all.length;
    const totalPages = ceil(queryCount / PER_PAGE);
    if (pages && pages > 1) {
      this.setLimit(PER_PAGE);
    }
    return {
      count,
      totalCount,
      currentPage: 0,
      pages: pages || 1,
      totalPages,
      data: all
    };
  }

  public async byId(id: string): Promise<T> {
    return super.findById(id);
  }
}
