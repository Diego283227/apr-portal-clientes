const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Password hasheado:', hashedPassword);
    return hashedPassword;
  } catch (error) {
    console.error('Error hasheando password:', error);
  }
}

// Cambia 'admin123' por tu password deseado
hashPassword('admin123');