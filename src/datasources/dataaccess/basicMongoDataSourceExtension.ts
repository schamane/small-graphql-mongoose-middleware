import { includes } from 'lodash';
import type { Document } from 'mongoose';
import type { GrapqhContext } from '../../middleware';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export abstract class BasicMongoDataSourceExtension<T extends Document, TContext extends GrapqhContext> {
  protected context: TContext;

  public initialize(context: TContext): void {
    this.context = context;
  }

  public hasRole(role: string): boolean {
    return includes(this.context.groups, role);
  }
}
