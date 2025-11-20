/**
 * Script para limpiar lecturas huérfanas
 * Elimina lecturas de socios que ya no tienen medidor asignado
 * 
 * PROBLEMA: Cuando se elimina un medidor, las lecturas viejas quedan en la DB
 * y aparecen como "última lectura" cuando se asigna un nuevo medidor
 * 
 * Este script limpia esas lecturas huérfanas
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Lectura = require('./src/models/Lectura').default;
const { User } = require('./src/models');

async function cleanupOrphanReadings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // 1. Obtener todos los socios SIN medidor
    const sociosSinMedidor = await User.find({
      role: 'socio',
      $or: [
        { medidor: { $exists: false } },
        { medidor: null },
        { 'medidor.numero': { $exists: false } },
        { 'medidor.numero': null },
        { 'medidor.numero': '' }
      ]
    }).select('_id nombres apellidos rut codigoSocio medidor');

    console.log(`\n📊 Encontrados ${sociosSinMedidor.length} socios SIN medidor asignado:`);
    sociosSinMedidor.forEach(socio => {
      console.log(`   - ${socio.nombres} ${socio.apellidos} (${socio.codigoSocio}) - medidor: ${socio.medidor?.numero || 'NINGUNO'}`);
    });

    if (sociosSinMedidor.length === 0) {
      console.log('\n✅ No hay socios sin medidor. Nada que limpiar.');
      process.exit(0);
    }

    // 2. Buscar lecturas huérfanas (lecturas de socios sin medidor)
    const socioIdsSinMedidor = sociosSinMedidor.map(s => s._id);
    
    const lecturasHuerfanas = await Lectura.find({
      socioId: { $in: socioIdsSinMedidor }
    }).populate('socioId', 'nombres apellidos rut codigoSocio');

    console.log(`\n🔍 Encontradas ${lecturasHuerfanas.length} lecturas huérfanas (de socios sin medidor):`);
    
    if (lecturasHuerfanas.length === 0) {
      console.log('✅ No hay lecturas huérfanas. Base de datos limpia.');
      process.exit(0);
    }

    // Agrupar por socio para mostrar resumen
    const lecturasPorSocio = {};
    lecturasHuerfanas.forEach(lectura => {
      const socioId = lectura.socioId._id.toString();
      if (!lecturasPorSocio[socioId]) {
        lecturasPorSocio[socioId] = {
          socio: lectura.socioId,
          lecturas: []
        };
      }
      lecturasPorSocio[socioId].lecturas.push(lectura);
    });

    console.log('\n📋 Detalle de lecturas huérfanas por socio:');
    Object.values(lecturasPorSocio).forEach(({ socio, lecturas }) => {
      console.log(`\n   👤 ${socio.nombres} ${socio.apellidos} (${socio.codigoSocio})`);
      console.log(`      Total lecturas: ${lecturas.length}`);
      lecturas.forEach(lectura => {
        console.log(`      - Fecha: ${lectura.fechaLectura.toLocaleDateString()}, Lectura: ${lectura.lecturaActual}m³, Medidor: ${lectura.numeroMedidor}`);
      });
    });

    // 3. Confirmar eliminación
    console.log(`\n⚠️  Se eliminarán ${lecturasHuerfanas.length} lecturas huérfanas`);
    console.log('⚠️  Estas lecturas corresponden a socios que ya NO tienen medidor asignado');
    console.log('⚠️  Esto evitará que aparezcan como "última lectura" al asignar un nuevo medidor');
    
    // Eliminar
    const result = await Lectura.deleteMany({
      socioId: { $in: socioIdsSinMedidor }
    });

    console.log(`\n✅ Eliminadas ${result.deletedCount} lecturas huérfanas`);
    console.log('✅ Ahora los socios sin medidor no tendrán lecturas antiguas');
    console.log('✅ Al asignar un nuevo medidor, se usará la lectura inicial correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

cleanupOrphanReadings();
