import { prisma } from '../config/prisma.js'
import { hashPassword } from '../modules/auth/password.js'
import { UserRole } from '../generated/prisma/enums.js'

async function main() {
  const nameArg = process.argv[2]
  const emailArg = process.argv[3]
  const passwordArg = process.argv[4]

  const name = nameArg || "Murang'a County Administrator"
  const email = (emailArg || 'admin@muranga.go.ke').toLowerCase().trim()
  const password = passwordArg || 'CountyAdmin2026!'

  console.log(`[seed-admin] Provisioning administrator account: ${email}...`)

  const passwordHash = await hashPassword(password)
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { email },
      data: {
        name,
        role: UserRole.ADMIN,
        isActive: true,
        emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date(),
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    })
    console.log(`[seed-admin] Successfully updated existing user to ADMIN:`)
    console.log(JSON.stringify(updated, null, 2))
  } else {
    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    })
    console.log(`[seed-admin] Successfully created new administrator:`)
    console.log(JSON.stringify(created, null, 2))
  }

  console.log(`\nAdministrator credentials:`)
  console.log(`  Email:    ${email}`)
  console.log(`  Password: ${password}`)
  console.log(`\nYou can now sign in at http://localhost:5173 with this administrator account.`)
}

main()
  .catch((err) => {
    console.error('[seed-admin] Error provisioning administrator:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
