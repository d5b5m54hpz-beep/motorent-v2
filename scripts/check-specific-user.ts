import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userId = "3ee0672e-c08d-4dcd-a1d3-10e52851e27d";

  console.log(`🔍 Checking user ${userId}...`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    console.log("❌ User not found in database");
    return;
  }

  console.log("✅ User found:");
  console.log(JSON.stringify(user, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
