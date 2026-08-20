const prisma = require('./db');

async function seed() {
  console.log('Seeding SQLite database with default Admin account...');
  
  const adminToken = 'hr_admin_master_token_2026';
  const adminUsername = 'admin';

  const existingAdmin = await prisma.user.findUnique({ where: { token: adminToken } });
  
  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        token: adminToken,
        role: 'ADMIN'
      }
    });
    console.log(`✅ Default Admin created successfully!`);
    console.log(`  - Username: ${admin.username}`);
    console.log(`  - Role: ${admin.role}`);
    console.log(`  - Master Token: ${admin.token}`);
  } else {
    console.log(`ℹ️ Admin account already exists (Token: ${existingAdmin.token})`);
  }

  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
