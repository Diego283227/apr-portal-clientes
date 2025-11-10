import mongoose from 'mongoose';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function asignarMedidor() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar socio
    const busqueda = await question('Ingrese RUT, email o código del socio: ');

    const socio = await User.findOne({
      role: 'socio',
      $or: [
        { rut: { $regex: busqueda, $options: 'i' } },
        { email: { $regex: busqueda, $options: 'i' } },
        { codigoSocio: { $regex: busqueda, $options: 'i' } }
      ]
    });

    if (!socio) {
      console.log('❌ Socio no encontrado');
      await mongoose.disconnect();
      rl.close();
      return;
    }

    console.log('\n📋 Socio encontrado:');
    console.log(`   Nombre: ${socio.nombres} ${socio.apellidos}`);
    console.log(`   RUT: ${socio.rut}`);
    console.log(`   Email: ${socio.email}`);
    console.log(`   Código: ${socio.codigoSocio}`);

    if (socio.medidor && socio.medidor.numero) {
      console.log(`\n⚠️  Ya tiene medidor asignado: ${socio.medidor.numero}`);
      const reemplazar = await question('¿Desea reemplazarlo? (si/no): ');
      if (reemplazar.toLowerCase() !== 'si') {
        console.log('Operación cancelada');
        await mongoose.disconnect();
        rl.close();
        return;
      }
    }

    console.log('\n📝 Ingrese los datos del medidor:');

    const numeroMedidor = await question('Número de medidor: ');
    if (!numeroMedidor.trim()) {
      console.log('❌ El número de medidor es obligatorio');
      await mongoose.disconnect();
      rl.close();
      return;
    }

    const ubicacion = await question('Ubicación (opcional): ');
    const fechaInstalacion = await question('Fecha de instalación (YYYY-MM-DD) (opcional): ');
    const lecturaInicial = await question('Lectura inicial en m³ (default: 0): ');

    console.log('\n📋 Seleccione categoría de usuario:');
    console.log('   1. Residencial');
    console.log('   2. Comercial');
    console.log('   3. Industrial');
    console.log('   4. Tercera Edad');
    const categoriaOpt = await question('Opción (1-4): ');

    const categorias = ['residencial', 'comercial', 'industrial', 'tercera_edad'];
    const categoriaUsuario = categorias[parseInt(categoriaOpt) - 1] || 'residencial';

    // Actualizar socio
    socio.medidor = {
      numero: numeroMedidor.trim(),
      ubicacion: ubicacion.trim() || undefined,
      fechaInstalacion: fechaInstalacion.trim() ? new Date(fechaInstalacion.trim()) : undefined,
      lecturaInicial: lecturaInicial.trim() ? parseInt(lecturaInicial) : 0
    };
    socio.categoriaUsuario = categoriaUsuario;

    await socio.save();

    console.log('\n✅ Medidor asignado exitosamente!');
    console.log('\n📊 Datos guardados:');
    console.log(`   Número: ${socio.medidor.numero}`);
    console.log(`   Ubicación: ${socio.medidor.ubicacion || 'No especificada'}`);
    console.log(`   Fecha instalación: ${socio.medidor.fechaInstalacion ? new Date(socio.medidor.fechaInstalacion).toLocaleDateString() : 'No especificada'}`);
    console.log(`   Lectura inicial: ${socio.medidor.lecturaInicial} m³`);
    console.log(`   Categoría: ${socio.categoriaUsuario}`);

    await mongoose.disconnect();
    console.log('\n✅ Desconectado de MongoDB');
    rl.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

asignarMedidor();
