// Create or reset an admin login without going through the public sign-up form.
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='…' npm run user:create-admin
// The email must also be listed in ADMIN_EMAILS for the app to grant admin rights.
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD");
  if (password.length < 12) throw new Error("Use an admin password of at least 12 characters");
  const admins = (process.env.ADMIN_EMAILS ?? "").toLowerCase().split(",").map((e) => e.trim());
  if (!admins.includes(email)) console.warn(`Warning: ${email} is not in ADMIN_EMAILS, so it won't get admin rights.`);
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({ where: { email }, create: { email, passwordHash }, update: { passwordHash } });
  console.log(`Admin login ready for ${email}`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
