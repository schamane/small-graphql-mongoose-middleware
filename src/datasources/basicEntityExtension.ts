import { omit } from 'lodash';
import type { Document } from 'mongoose';
import { GrapqhContext } from '..';

export class BasicEntityExtension<T extends Document, TContext extends GrapqhContext> {
  private context: TContext;

  initialize(context: TContext): void {
    this.context = context;
  }

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
