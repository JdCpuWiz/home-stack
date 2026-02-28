import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_USERNAME ?? "admin";
  const email = process.env.SEED_EMAIL ?? "admin@homestack.local";
  const password = process.env.SEED_PASSWORD ?? "changeme";

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`User "${username}" already exists — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { username, email, passwordHash, role: "ADMIN" },
  });

  console.log(`Created admin user: ${user.username} (id=${user.id})`);
  console.log(`Login with username="${username}" password="${password}"`);
  console.log(`Change the password immediately!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
