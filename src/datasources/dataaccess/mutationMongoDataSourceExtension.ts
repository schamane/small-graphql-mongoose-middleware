import type { Document } from 'mongoose';
import type { GrapqhContext } from '../../middleware';
import { BasicMongoDataSourceExtension } from './basicMongoDataSourceExtension';

export abstract class MutationMongoDataSourceExtension<
  T extends Document,
  TContext extends GrapqhContext
> extends BasicMongoDataSourceExtension<T, TContext> {
  public abstract entityPreSave(entity: Partial<T>): Partial<T>;

  public abstract entityPreUpdate(entity: Partial<T>): Partial<T>;
}
