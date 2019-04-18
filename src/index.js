import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import session from 'express-session'
import connectRedis from 'connect-redis'
import { ApolloServer } from 'apollo-server-express'

import typeDefs from './schema'
import resolvers from './resolvers'

dotenv.config({
  path: `.env.${process.env.NODE_ENV}`,
})

const port = process.env.PORT || 4000
const dev = process.env.NODE_ENV !== 'production'

const startServer = async () => {
  await mongoose
    .connect(
      `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${
        process.env.DB_HOST
      }:${process.env.DB_PORT}/${process.env.DB_NAME}`,
      { useNewUrlParser: true },
    )
    .then(() => console.log(`🔗  MongoDB Connected...`))
    .catch(err => console.log(`❌  MongoDB Connection error: ${err}`))

  const app = express()

  // app.disable('x-powered-by')
  app.set('trust proxy', 1);

  app.use((req, _, next) => {
    const authorization = req.headers.authorization;

    if (authorization) {
      try {
        const cid = authorization.split(" ")[1];
        req.headers.cookie = `cid=${cid}`;
        console.log(cid);
      } catch(err) {
        console.log(err)
      }
    }

    return next();
  });

  const RedisStore = connectRedis(session)

  app.use(
    session({
      store: new RedisStore({
        host: 'redis-17631.c135.eu-central-1-1.ec2.cloud.redislabs.com',
        port: 17631,
        pass: 'iBEr94e1rXOFqPO8qEDtwwaxALbQfceh',
      }),
      name: 'cid',
      secret: 'daswe?sidyt!dyn',
      saveUninitialized: false,
      resave: false,
      cookie: {
        // sameSite: true,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
        secure: false
      },
    }),
  )

  app.use(
    cors({
      credentials: true,
      origin: 
        process.env.NODE_ENV === 'production'
          ? process.env.FRONT_END_URL
          : 'http://localhost:3000',
    }),
  )

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    playground: !dev
      ? false
      : {
          settings: {
            'request.credentials': 'include',
          },
        },
    context: ({ req, res }) => ({ req, res }),
  })

  server.applyMiddleware({ app, cors: false })

  app.listen({ port }, () =>
    console.log(
      `🚀  Server ready at http://localhost:${port}${server.graphqlPath}`,
    ),
  )
}

startServer()
