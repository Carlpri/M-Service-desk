import app from './app.js'
import { env } from './config/env.js'
import { prisma } from './config/prisma.js'

const server = app.listen(env.PORT, () => {
  console.info(`M-Service Desk API listening on port ${env.PORT}`)
})

function shutdown(signal: string) {
  console.info(`${signal} received; shutting down`)
  server.close((error) => {
    if (error) {
      console.error('HTTP server shutdown failed:', error)
      process.exitCode = 1
    }

    void prisma.$disconnect().finally(() => {
      if (error) process.exit(1)
    })
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
