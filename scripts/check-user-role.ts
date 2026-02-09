import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userId = "8c1e8d34-62ea-4b34-b5a7-4c136fca3311";

  console.log(`🔍 Checking user ${userId}...`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    console.log("❌ User not found");
    return;
  }

  console.log("User data:");
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
