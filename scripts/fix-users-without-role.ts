import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Fixing users without role...");

  // Find all users without role
  const usersWithoutRole = await prisma.user.findMany({
    where: {
      role: { equals: null },
    },
  });

  console.log(`Found ${usersWithoutRole.length} users without role`);

  // Update each user to have CLIENTE role
  for (const user of usersWithoutRole) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: Role.CLIENTE },
    });
    console.log(`✅ Updated user ${user.email} → CLIENTE`);
  }

  console.log("✅ Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
