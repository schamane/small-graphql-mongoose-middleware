import type { DataSource } from 'apollo-datasource';

export type DataSources<TContext> = {
  [name: string]: DataSource<TContext>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApolloServerDataSources<TContext = any> = () => DataSources<TContext>;
