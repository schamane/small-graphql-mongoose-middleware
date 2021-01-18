import { DataSource, DataSourceConfig } from 'apollo-datasource';
import {
  isArray,
  filter,
  flatten,
  get,
  head,
  keys,
  last,
  map,
  merge,
  includes,
  some,
  orderBy,
  uniq,
  unzip,
  uniqBy,
  isFunction
} from 'lodash';
import type { Document, FilterQuery, Model, Query, UpdateQuery } from 'mongoose';
import { Filter, QueryFieldsType, Sorter } from './mongo';
import { GrapqhContext } from '..';
import {
  filterToQuery,
  filtersToQuery,
  translateSorter,
  languageFilter,
  translationsFieldPath,
  translationsFieldStringPath
} from '../utils';
import { SortDirection } from './mongo/filter';

type LodashSortDirection = boolean | 'asc' | 'desc';
interface LodashSort {
  fields: string[];
  direction: LodashSortDirection[];
}

export abstract class MongoDataSource<T extends Document, TContext extends GrapqhContext = GrapqhContext> extends DataSource<TContext> {
  protected Entity: Model<T>;

  protected context: TContext;

  protected importFields: string[];

  private fieldTranslations: QueryFieldsType;

  private limit: number | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extensions: any[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(entity: Model<T>, fieldTranslations: QueryFieldsType, exts?: any[]) {
    super();
    this.Entity = entity;
    this.fieldTranslations = fieldTranslations;
    this.extensions = map(exts, (Ext) => new Ext());
  }

  initialize(config: DataSourceConfig<TContext>): void {
    this.context = config.context;
    map(this.extensions, (ext) => ext.initialize(config.context));
  }

  public async add(entity: Partial<T>): Promise<T> {
    const instance = new this.Entity(this.entityPreSave(entity));
    return instance.save();
  }

  public async update(entity: Partial<T>): Promise<T> {
    const { _id } = entity;
    const original = await this.findById(_id);
    await original.updateOne(this.entityPreUpdate(entity));
    return this.findById(_id);
  }

  public async import(data: T[]): Promise<number> {
    const {
      db,
      collection: { name }
    } = this.Entity;
    const { insertedCount } = await db.collection(name).insertMany(data);
    // eslint-disable-next-line no-console
    console.debug(`Inserted ${name}:`, insertedCount);
    return insertedCount;
  }

  public async truncate(): Promise<void> {
    const {
      db,
      collection: { name }
    } = this.Entity;
    return db.dropCollection(name);
  }

  public async findByIdAndDelete(id: string): Promise<T> {
    return this.Entity.findByIdAndDelete(id);
  }

  public async findByIds(ids: string[]): Promise<T[]> {
    // return this.Entity.find({ _id: { $in: map(ids, Types.ObjectId)] } });
    return this.Entity.find(this.entityPreQuery({})).where('_id').in(ids).exec();
  }

  protected async findById(id: string): Promise<T> {
    return this.Entity.findById(id);
  }

  protected async find(filters: Filter | Filter[], sort?: Sorter, distinct?: string): Promise<T[]> {
    const query = isArray(filters) ? filtersToQuery(filters, this.fieldTranslations) : filterToQuery(filters, this.fieldTranslations);
    const entity = this.Entity.find(this.entityPreQuery(query));
    if (this.limit) {
      entity.limit(this.limit);
    }
    return this.sortAndExecuteQuery(entity, sort, distinct);
  }

  protected async count(filters: Filter | Filter[], distinct?: string): Promise<number> {
    const query = isArray(filters) ? filtersToQuery(filters, this.fieldTranslations) : filterToQuery(filters, this.fieldTranslations);
    const entity = this.Entity;
    return distinct
      ? entity.distinct(distinct).countDocuments(this.entityPreQuery(query))
      : entity.countDocuments(this.entityPreQuery(query));
  }

  protected async all(sort?: Sorter, distinct?: string): Promise<T[]> {
    const entity = this.Entity.find(this.entityPreQuery({}));
    if (this.limit) {
      entity.limit(this.limit);
    }
    return this.sortAndExecuteQuery(entity, sort, distinct);
  }

  protected setLimit(limit: number): void {
    this.limit = limit;
  }

  protected getLimit(): number | undefined {
    return this.limit;
  }

  public abstract filter(filters: Filter[], sort?: Sorter): Promise<T[] | Partial<T>[]>;

  public abstract list(sort?: Sorter): Promise<T[] | Partial<T>[]>;

  protected abstract valuesFilter(): Filter;

  private entityPreSave(entity: Partial<T>): Partial<T> {
    let result = entity;
    map(this.extensions, (ext) => {
      result = ext.entityPreSave && isFunction(ext.entityPreSave) ? ext.entityPreSave(result) : result;
    });
    return result;
  }

  private entityPreUpdate(entity: Partial<T>): UpdateQuery<T> {
    let result = entity;
    map(this.extensions, (ext) => {
      result = ext.entityPreUpdate && isFunction(ext.entityPreUpdate) ? ext.entityPreUpdate(result) : result;
    });
    return (result as unknown) as UpdateQuery<T>;
  }

  private entityPreQuery(query: FilterQuery<T>): FilterQuery<T> {
    let result = query;
    map(this.extensions, (ext) => {
      result = ext.entityPreQuery && ext.entityPreQuery ? ext.entityPreQuery(result) : result;
    });
    return query;
  }

  public async values<V extends unknown>(attribute: string, language: string): Promise<V[]> {
    const query = { ...languageFilter(attribute, language), ...filterToQuery(this.valuesFilter(), this.fieldTranslations) };
    const res = await this.Entity.find(this.entityPreQuery(query)).select(translationsFieldPath(attribute));

    // detect if translation is in object or array
    const firstItem = head(res);
    const path = isArray(get(firstItem, attribute)) ? translationsFieldStringPath(attribute) : translationsFieldPath(attribute);

    const translations = flatten(map(res, path));
    const translationsFiltered = map(filter(translations, { language }), 'translation');
    return uniq(translationsFiltered);
  }

  private toSortObject(sorter: Sorter): Record<string, SortDirection> {
    const { name, direction } = sorter;
    const fields = translateSorter(name, this.fieldTranslations);

    const mapFn = (myfields: string[]): Record<string, SortDirection>[] => map(myfields, (field) => ({ [field]: direction }));
    return isArray(fields) ? merge({}, ...mapFn(fields)) : { [fields]: sorter.direction };
  }

  private static toLodashSort(sortObject: Record<string, SortDirection>): LodashSort {
    const result = unzip(map(keys(sortObject), (key) => [key, get(sortObject, key)]));
    return { fields: head(result), direction: (last(result) as unknown) as LodashSortDirection[] };
  }

  private async sortAndExecuteQuery<V extends Document>(query: Query<V[], V>, sort?: Sorter, distinct?: string): Promise<V[]> {
    if (!sort) {
      return distinct ? query.distinct(distinct).exec() : query.exec();
    }
    const sortObject = this.toSortObject(sort);
    if (MongoDataSource.isSortOnDB(sortObject)) {
      return MongoDataSource.sortAndExecuteQueryOnDB(query, sortObject, distinct);
    }

    return MongoDataSource.sortAndExecuteQueryOnApi(query, sortObject, distinct);
  }

  private static async sortAndExecuteQueryOnDB<V extends Document>(
    query: Query<V[], V>,
    sortObject: Record<string, SortDirection>,
    distinct?: string
  ): Promise<V[]> {
    return distinct ? query.distinct(distinct).sort(sortObject).exec() : query.sort(sortObject).exec();
  }

  private static async sortAndExecuteQueryOnApi<V extends Document>(
    query: Query<V[], V>,
    sortObject: Record<string, SortDirection>,
    distinct?: string
  ): Promise<V[]> {
    const result = await query.exec();
    const { fields, direction } = MongoDataSource.toLodashSort(sortObject);
    return distinct ? (uniqBy(orderBy(result, fields, direction), distinct) as V[]) : (orderBy(result, fields, direction) as V[]);
  }

  private static isSortOnDB(sortObject: Record<string, SortDirection>): boolean {
    const list = keys(sortObject);
    const result = some(list, (i) => includes(i, '.'));
    return !result;
  }
}
