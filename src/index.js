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

  app.disable('x-powered-by')

  const RedisStore = connectRedis(session)

  app.use(
    session({
      store: new RedisStore({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        pass: process.env.REDIS_PASS,
      }),
      name: process.env.SESS_NAME,
      secret: process.env.SESS_SECRET,
      saveUninitialized: false,
      rolling: true,
      resave: true,
      cookie: {
        sameSite: true,
        maxAge: 1000 * 60 * 60 * 24,
        secure: process.env.NODE_ENV === 'production',
      },
    }),
  )

  app.use(
    cors({
      credentials: true,
      origin:
        process.env.NODE_ENV === 'production'
          ? 'https://pp-app.byurhanbeyzat.com'
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
