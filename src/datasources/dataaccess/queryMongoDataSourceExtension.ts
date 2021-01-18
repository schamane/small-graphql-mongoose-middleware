import type { FilterQuery, Document } from 'mongoose';
import type { GrapqhContext } from '../../middleware';
import { BasicMongoDataSourceExtension } from './basicMongoDataSourceExtension';

export abstract class QueryMongoDataSourceExtension<
  T extends Document,
  TContext extends GrapqhContext
> extends BasicMongoDataSourceExtension<T, TContext> {
  public abstract entityPreQuery(query: FilterQuery<T>): FilterQuery<T>;
}
