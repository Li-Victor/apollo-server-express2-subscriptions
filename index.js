import express from 'express';
import { ApolloServer, gql, PubSub } from 'apollo-server-express';
import path from 'path';
import http from 'http';

const pubsub = new PubSub();
const POST_ADDED = 'POST_ADDED';

const posts = [
  {
    author: 'Bob',
    comment: 'Cool Post Bro!'
  }
];

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type Post {
    author: String!
    comment: String!
  }

  type Query {
    posts: [Post!]!
  }

  type Mutation {
    addPost(author: String!, comment: String!): Post!
  }

  type Subscription {
    postAdded: Post!
  }

`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    posts() {
      return posts;
    }
  },
  Mutation: {
    addPost(parent, { author, comment }, context) {
      const newPost = {
        author,
        comment
      };
      posts.push(newPost);
      pubsub.publish(POST_ADDED, { postAdded: newPost });
      return newPost;
    }
  },
  Subscription: {
    postAdded: {
      subscribe: () => pubsub.asyncIterator([POST_ADDED])
    }
  }
};

const endpoint = '/graphql';

const app = express();

// setting up middleware
app.use(endpoint, (req, res, next) => {
  req.username = 'username';
  next();
});

app.use(express.static(path.join(__dirname, './client')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './client/index.html'));
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  // username can be used in context, passed from middleware
  context: async ({ req, res, connection }) => {
    // for subscription context
    if (connection) {
      // check connection for metadata
      return {};
    } else {
      // for normal query and mutation contexts
      console.log(req.username);

      return {};
    }
  }
});

server.applyMiddleware({ app, endpoint });

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

const PORT = 5000;

// to change the endpoint to graphql, have to change the node_modules folder on Apollo Server
httpServer.listen(PORT, () => {
  console.log(
    `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
  );
  console.log(
    `🚀 Subscriptions ready at ws://localhost:${PORT}${
      server.subscriptionsPath
    }`
  );
});
