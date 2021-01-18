import { omit } from 'lodash';
import type { Document } from 'mongoose';
import { GrapqhContext } from '..';
import { MutationMongoDataSourceExtension } from './dataaccess/mutationMongoDataSourceExtension';

export class BasicEntityExtension<T extends Document, TContext extends GrapqhContext> extends MutationMongoDataSourceExtension<
  T,
  TContext
> {
  public entityPreSave(entity: Partial<T>): Partial<T> {
    return {
      ...entity,
      createdBy: this.context ? this.context.id : 'nocontext',
      createdAt: new Date()
    };
  }

  public entityPreUpdate(entity: Partial<T>): Partial<T> {
    return {
      ...omit(entity, ['_id', 'createdBy', 'createdAt']),
      updatedBy: this.context ? this.context.id : 'nocontext',
      updatedAt: new Date()
    };
  }
}
