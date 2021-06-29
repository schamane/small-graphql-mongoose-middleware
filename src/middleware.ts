import { get, compact, map, merge } from 'lodash';
import {
  ApolloServer,
  ApolloServerExpressConfig,
  IExecutableSchemaDefinition,
  IResolvers,
  PlaygroundConfig,
  PubSub,
  SchemaDirectiveVisitor
} from 'apollo-server-express';
import { Server } from 'http';
import { authenticate } from 'passport';
import { EventEmitter } from 'events';
import type { GraphQLSchema } from 'graphql';
import type { Application, Request } from 'express';
import type { DataSource } from 'apollo-datasource';
import { ApolloServerDataSources } from './grapqhl-extras';
import { User } from './auth/userModel';

export type GrapqhContext = {
  id: string;
  groups: string[];
  dataSources: Record<string, DataSource>;
};

export const makeSchema = (schemasDefs: IExecutableSchemaDefinition[]): ApolloServerExpressConfig => {
  const typeDefs = compact(map(schemasDefs, 'typeDef'));
  const schemaDirectives = merge({}, ...compact(map(schemasDefs, 'schemaDirectives')));
  const resolvers = compact<IResolvers>(merge(map(schemasDefs, 'resolvers')));
  /*
  return makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaTransforms
  });
  */
  return {
    typeDefs,
    resolvers,
    schemaDirectives
  };
};

export type graphQLAuthCreateContext = (user: unknown, authInfo: unknown) => User | Promise<User>;

const graphqlAuth =
  (authStrategy: string | string[], createContextFn?: graphQLAuthCreateContext) =>
  async ({ req, connection }: { req: Request; connection: unknown }): Promise<User> => {
    if (connection) {
      return get(connection, 'context');
    }
    return new Promise((resolve, reject) =>
      authenticate(authStrategy, { session: false }, async (err, user, authInfo) =>
        err ? reject(err) : resolve(createContextFn ? await createContextFn(user, authInfo) : user)
      )(req)
    );
  };

export interface GraphQlOptions {
  path: string;
  introspection: boolean;
  playground?: PlaygroundConfig;
  tracing: boolean;
}

export const GraphQlServer = (
  app: Application,
  dataSources: ApolloServerDataSources,
  graphQlOptions: GraphQlOptions,
  schema: ApolloServerExpressConfig,
  authStrategy: string | string[],
  createContextFn?: graphQLAuthCreateContext
): ApolloServer => {
  const options: ApolloServerExpressConfig = {
    ...schema,
    context: graphqlAuth(authStrategy, createContextFn),
    dataSources,
    playground: graphQlOptions.playground,
    subscriptions: graphQlOptions.path
  };

  const server = new ApolloServer(options);
  server.applyMiddleware({ app, ...graphQlOptions });
  return server;
};

export const installGraphQlSubscriptions = (graphQlServer: ApolloServer, server: Server): void => {
  graphQlServer.installSubscriptionHandlers(server);
};

export const isAllowedUser = (user: User): boolean => {
  return !!user;
};

// TODO: rework pubSub instanciating
// export const ApplicationPubSub = new PubSub();

const biggerEventEmitter = new EventEmitter();
biggerEventEmitter.setMaxListeners(30);

export const ApplicationPubSub = new PubSub({ eventEmitter: biggerEventEmitter });

// export type ResolverFn = (...params: unknown[]) => unknown;
