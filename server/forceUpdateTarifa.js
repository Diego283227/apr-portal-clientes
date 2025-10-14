const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/apr';

async function updateTarifa() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db();
    const collection = db.collection('tarifaconfigs');

    // Buscar tarifa activa
    const tarifa = await collection.findOne({ activa: true });

    if (!tarifa) {
      console.log('❌ No hay tarifa activa');
      return;
    }

    console.log(`📝 Actualizando tarifa: ${tarifa.nombre}`);

    // Actualizar con nuevos escalones
    const result = await collection.updateOne(
      { _id: tarifa._id },
      {
        $set: {
          escalones: [
            {
              desde: 0,
              hasta: 10,
              tarifaResidencial: 500,
              tarifaComercial: 700,
              tarifaIndustrial: 900,
              tarifaTerceraEdad: 400
            },
            {
              desde: 11,
              hasta: 20,
              tarifaResidencial: 800,
              tarifaComercial: 1000,
              tarifaIndustrial: 1200,
              tarifaTerceraEdad: 700
            },
            {
              desde: 21,
              hasta: 30,
              tarifaResidencial: 1200,
              tarifaComercial: 1400,
              tarifaIndustrial: 1600,
              tarifaTerceraEdad: 1000
            },
            {
              desde: 31,
              hasta: -1,
              tarifaResidencial: 1500,
              tarifaComercial: 1800,
              tarifaIndustrial: 2000,
              tarifaTerceraEdad: 1300
            }
          ]
        }
      }
    );

    console.log(`✅ Actualización exitosa: ${result.modifiedCount} documento(s) modificado(s)\n`);

    // Verificar
    const tarifaActualizada = await collection.findOne({ _id: tarifa._id });
    console.log('📐 Escalones ahora:');
    tarifaActualizada.escalones.forEach((e, i) => {
      console.log(`  ${i+1}. ${e.desde}-${e.hasta === -1 ? '∞' : e.hasta} m³ → Residencial: $${e.tarifaResidencial}/m³`);
    });

  } finally {
    await client.close();
  }
}

updateTarifa()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
