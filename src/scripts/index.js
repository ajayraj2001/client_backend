const { Admin } = require('../models');
const bcrypt = require('bcrypt');

async function scripts() {
  await createFirstAdmin();
}

module.exports = scripts;

async function createFirstAdmin() {
  const result = await Admin.findOne();
  if (result) return;
  // const salt = await bcrypt.genSalt(10);
  // console.log('salt is here', salt)
  const hashedPassword = await bcrypt.hash('Password@1', 10);

  const admin = new Admin({
    email: 'admin@gmail.com',
    name: 'Admin',
    role: 'admin',
    status: "Active",
    password: hashedPassword,
  });
  await admin.save();
  console.log('New admin is created');
}
