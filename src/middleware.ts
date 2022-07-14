import { get, compact, map, merge } from 'lodash';
import { ApolloServer, ApolloServerExpressConfig, ServerRegistration } from 'apollo-server-express';
import type { IResolvers } from '@graphql-tools/utils';
import { IExecutableSchemaDefinition, makeExecutableSchema } from '@graphql-tools/schema';
import { Server } from 'http';
import passport from 'passport';
import { EventEmitter } from 'events';
import type { Application, Request } from 'express';
import type { DataSource } from 'apollo-datasource';
import { GraphQLSchema } from 'graphql/type/schema';
import { PubSub } from 'graphql-subscriptions';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import { ApolloServerDataSources } from './grapqhl-extras';
import { User } from './auth/userModel';

export type GrapqhContext = {
  id: string;
  groups: string[];
  dataSources: Record<string, DataSource>;
};

export const makeSchema = (schemasDefs: IExecutableSchemaDefinition[]): GraphQLSchema => {
  const typeDefs = compact(map(schemasDefs, 'typeDef'));
  // const schemaDirectives = merge({}, ...compact(map(schemasDefs, 'schemaDirectives')));
  const resolvers = compact<IResolvers>(merge(map(schemasDefs, 'resolvers')));
  return makeExecutableSchema({
    typeDefs,
    resolvers
    // TODO: implement shema directices https://www.graphql-tools.com/docs/schema-directives
    // schemaDirectives
  });
};

export type graphQLAuthCreateContext = (user: unknown, authInfo: unknown) => User | Promise<User>;

const graphqlAuth =
  (authStrategy: string | string[], createContextFn?: graphQLAuthCreateContext) =>
  async ({ req, connection }: { req: Request; connection: unknown }): Promise<User> => {
    if (connection) {
      return get(connection, 'context');
    }
    return new Promise((resolve, reject) =>
      passport.authenticate(authStrategy, { session: false }, async (err, user, authInfo) =>
        err ? reject(err) : resolve(createContextFn ? await createContextFn(user, authInfo) : user)
      )(req)
    );
  };

export const GraphQlServer = async (
  app: Application,
  dataSources: ApolloServerDataSources,
  graphQlOptions: Partial<ServerRegistration>,
  schema: GraphQLSchema,
  authStrategy: string | string[],
  createContextFn?: graphQLAuthCreateContext
): Promise<ApolloServer> => {
  const options: ApolloServerExpressConfig = {
    schema,
    context: graphqlAuth(authStrategy, createContextFn),
    dataSources
    // playground: graphQlOptions.playground,
    // subscriptions: graphQlOptions.path
  };

  const server = new ApolloServer(options);
  await server.start();
  server.applyMiddleware({ app, ...graphQlOptions });
  console.log('shema', options.schema);
  return server;
};

export const installGraphQlSubscriptions = async (
  schema: GraphQLSchema,
  graphQlServer: ApolloServer,
  server: Server,
  authStrategy: string | string[],
  createContextFn?: graphQLAuthCreateContext
): Promise<SubscriptionServer> => {
  // graphQlServer.installSubscriptionHandlers(server);
  return SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect: graphqlAuth(authStrategy, createContextFn)
    },
    {
      server,
      path: graphQlServer.graphqlPath
    }
  );
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
