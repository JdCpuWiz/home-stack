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

async function seedGrocery() {
  const stores = [
    { name: "Walmart", position: 0 },
    { name: "Sam's Club", position: 1 },
    { name: "Aldi", position: 2 },
  ];

  for (const s of stores) {
    await prisma.groceryStore.upsert({
      where: { name: s.name },
      update: { position: s.position },
      create: s,
    });
  }
  console.log(`Seeded ${stores.length} grocery stores.`);

  const areas = [
    "Produce",
    "Meat",
    "Dairy",
    "Frozen",
    "Bakery",
    "Deli",
    "Canned Goods",
    "Beverages",
    "Snacks",
    "Household",
    "Personal Care",
  ];

  for (let i = 0; i < areas.length; i++) {
    await prisma.groceryArea.upsert({
      where: { name: areas[i] },
      update: { position: i },
      create: { name: areas[i], position: i },
    });
  }
  console.log(`Seeded ${areas.length} grocery areas.`);
}

main()
  .then(() => seedGrocery())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
