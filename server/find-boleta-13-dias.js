const mongoose = require('mongoose');
require('dotenv').config();

async function findBoletasWithVencimiento() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-web');
    const db = mongoose.connection.db;

    const now = new Date();
    const thirteenDaysAgo = new Date(now);
    thirteenDaysAgo.setDate(thirteenDaysAgo.getDate() - 13);

    console.log(`\n📅 Fecha actual: ${now.toLocaleString('es-CL')}`);
    console.log(`📅 Hace 13 días: ${thirteenDaysAgo.toLocaleString('es-CL')}\n`);

    // Buscar TODAS las boletas (cualquier estado) con vencimiento cercano a hace 13 días
    const todasLasBoletas = await db.collection('boletas').find({}).toArray();

    console.log('=== BUSCANDO BOLETAS CON VENCIMIENTO HACE ~13 DÍAS ===\n');

    const boletasEncontradas = [];

    todasLasBoletas.forEach(boleta => {
      const vencimiento = new Date(boleta.fechaVencimiento);
      const diffDays = Math.floor((now - vencimiento) / (1000 * 60 * 60 * 24));
      
      // Buscar boletas vencidas hace 10-16 días (rango para capturar ~13 días)
      if (diffDays >= 10 && diffDays <= 16) {
        boletasEncontradas.push({
          ...boleta,
          diasVencidos: diffDays
        });
      }
    });

    if (boletasEncontradas.length > 0) {
      console.log(`✅ Encontradas ${boletasEncontradas.length} boletas con vencimiento hace ~13 días:\n`);
      
      boletasEncontradas.forEach(boleta => {
        console.log(`Boleta ${boleta.numeroBoleta}:`);
        console.log(`  ⚠️  Estado ACTUAL: ${boleta.estado}`);
        console.log(`  ❌ Estado CORRECTO: vencida`);
        console.log(`  📅 Vencimiento: ${new Date(boleta.fechaVencimiento).toLocaleString('es-CL')}`);
        console.log(`  ⏰ Días vencidos: ${boleta.diasVencidos}`);
        console.log(`  💰 Monto: $${boleta.montoTotal}`);
        console.log(`  👤 Socio ID: ${boleta.socioId}`);
        console.log(`  ✓ Pagada: ${boleta.pagada || false}`);
        console.log('');
      });

      // Buscar info del socio
      const socioIds = [...new Set(boletasEncontradas.map(b => b.socioId))];
      const socios = await db.collection('users').find({
        _id: { $in: socioIds }
      }).toArray();

      console.log('\n=== INFO DE SOCIOS ===\n');
      socios.forEach(socio => {
        const boletasDelSocio = boletasEncontradas.filter(b => b.socioId.toString() === socio._id.toString());
        console.log(`${socio.nombres} ${socio.apellidos} (${socio.rut}):`);
        console.log(`  📧 Email: ${socio.email}`);
        console.log(`  💳 Deuda total: $${socio.deudaTotal || 0}`);
        console.log(`  📋 Boletas encontradas: ${boletasDelSocio.length}`);
        boletasDelSocio.forEach(b => {
          console.log(`     - ${b.numeroBoleta} (${b.estado}) - ${b.diasVencidos} días`);
        });
        console.log('');
      });

      console.log('\n⚠️  PROBLEMA CONFIRMADO: Estas boletas deberían estar en estado VENCIDA');
      console.log('⚠️  El Cron Job NO está cambiando el estado automáticamente\n');

    } else {
      console.log('❌ No se encontraron boletas con vencimiento hace ~13 días\n');
      
      // Mostrar todas las boletas con su estado de vencimiento
      console.log('=== TODAS LAS BOLETAS (ordenadas por vencimiento) ===\n');
      const todasOrdenadas = todasLasBoletas
        .map(b => ({
          ...b,
          diasVencidos: Math.floor((now - new Date(b.fechaVencimiento)) / (1000 * 60 * 60 * 24))
        }))
        .sort((a, b) => b.diasVencidos - a.diasVencidos);

      todasOrdenadas.forEach(b => {
        console.log(`${b.numeroBoleta}: ${b.estado} - Vencimiento: ${new Date(b.fechaVencimiento).toLocaleDateString('es-CL')} (${b.diasVencidos} días)`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findBoletasWithVencimiento();
