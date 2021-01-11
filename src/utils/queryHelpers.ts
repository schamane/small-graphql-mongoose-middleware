import { map, merge } from 'lodash';

export class QueryHelper {
  public static packByKey<T>(datas: T[], key: string): { [key: string]: T }[] {
    const fn = (data: T): { [key: string]: T } => ({
      [key]: data
    });

    return map(datas, fn);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static mergePush<T>(categoryQuery: any[], categories: T[], key: string): void {
    const result = QueryHelper.packByKey(categories, key);

    merge(categoryQuery, result);
  }
}
