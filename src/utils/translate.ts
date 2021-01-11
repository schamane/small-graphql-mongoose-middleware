import { get } from 'lodash';
import type { QueryFields, QueryFieldsType } from '../datasources/mongo/filter';

export const translateField = (key: string, Translations: QueryFieldsType): QueryFields => get(Translations, key, key);
