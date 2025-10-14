import TarifaConfig, { ITarifaConfig } from '../models/TarifaConfig';
import { IUser } from '../models/User';

export interface CalculoTarifa {
  cargoFijo: number;
  costoConsumo: number;
  subtotal: number;
  descuentos: number;
  recargos: number;
  iva?: number;
  montoTotal: number;
  detalleCalculo: {
    escalones: Array<{
      desde: number;
      hasta: number;
      m3Consumidos: number;
      tarifaUnitaria: number;
      subtotal: number;
    }>;
    descuentosAplicados: Array<{
      nombre: string;
      tipo: string;
      valor: number;
      monto: number;
    }>;
    recargosAplicados: Array<{
      concepto: string;
      valor: number;
      monto: number;
    }>;
    temporadaAplicada?: {
      nombre: string;
      factor: number;
    };
  };
}

export class TarifaService {

  /**
   * Calcula la tarifa para un socio basado en su consumo
   */
  static async calcularTarifa(
    socio: IUser,
    consumoM3: number,
    periodo: Date,
    diasVencidos: number = 0,
    pagoAnticipado: boolean = false
  ): Promise<CalculoTarifa> {

    // 1. Obtener configuración de tarifa activa
    const tarifaConfig = await this.getTarifaActiva();
    if (!tarifaConfig) {
      throw new Error('No hay configuración de tarifa activa');
    }

    // 2. Determinar categoría del usuario
    const categoria = socio.categoriaUsuario || 'residencial';

    // 3. Calcular cargo fijo
    const cargoFijo = this.getCargoFijo(tarifaConfig, categoria);

    // 4. Calcular costo por consumo (escalonado)
    const { costoConsumo, detalleEscalones } = this.calcularConsumoEscalonado(
      tarifaConfig,
      categoria,
      consumoM3
    );

    // 5. Aplicar factor estacional
    const { costoConsumoConTemporada, temporadaAplicada } = this.aplicarTemporada(
      costoConsumo,
      tarifaConfig,
      periodo
    );

    // 6. Calcular subtotal
    const subtotal = cargoFijo + costoConsumoConTemporada;

    // 7. Aplicar descuentos
    const { montoDescuentos, descuentosAplicados } = await this.aplicarDescuentos(
      tarifaConfig,
      socio,
      consumoM3,
      subtotal,
      pagoAnticipado
    );

    // 8. Aplicar recargos por mora
    const { montoRecargos, recargosAplicados } = this.aplicarRecargos(
      tarifaConfig,
      subtotal - montoDescuentos,
      diasVencidos
    );

    // 9. Calcular IVA si aplica
    const baseIVA = subtotal - montoDescuentos + montoRecargos;
    const iva = tarifaConfig.configuracion.aplicarIVA
      ? baseIVA * ((tarifaConfig.configuracion.porcentajeIVA || 19) / 100)
      : 0;

    // 10. Calcular monto total
    const montoTotal = this.redondear(
      baseIVA + iva,
      tarifaConfig.configuracion.redondeoDecimales
    );

    return {
      cargoFijo,
      costoConsumo: costoConsumoConTemporada,
      subtotal,
      descuentos: montoDescuentos,
      recargos: montoRecargos,
      iva,
      montoTotal,
      detalleCalculo: {
        escalones: detalleEscalones,
        descuentosAplicados,
        recargosAplicados,
        temporadaAplicada
      }
    };
  }

  /**
   * Obtiene la configuración de tarifa activa
   */
  private static async getTarifaActiva(): Promise<ITarifaConfig | null> {
    const ahora = new Date();

    console.log('🔍 Buscando tarifa activa...');
    console.log('📅 Fecha actual:', ahora);

    // Buscar todas las tarifas activas para debug
    const todasActivas = await TarifaConfig.find({ activa: true });
    console.log(`📋 Total de tarifas con activa=true: ${todasActivas.length}`);

    if (todasActivas.length > 0) {
      todasActivas.forEach((t, i) => {
        console.log(`   Tarifa ${i + 1}:`, {
          nombre: t.nombre,
          activa: t.activa,
          fechaVigencia: t.fechaVigencia,
          fechaVencimiento: t.fechaVencimiento,
          vigenciaValida: t.fechaVigencia <= ahora
        });
      });
    }

    const tarifaActiva = await TarifaConfig.findOne({
      activa: true,
      fechaVigencia: { $lte: ahora },
      $or: [
        { fechaVencimiento: { $exists: false } },
        { fechaVencimiento: null },
        { fechaVencimiento: { $gte: ahora } }
      ]
    });

    if (tarifaActiva) {
      console.log('✅ Tarifa activa encontrada:', tarifaActiva.nombre);
    } else {
      console.log('❌ No se encontró tarifa activa que cumpla las condiciones');
    }

    return tarifaActiva;
  }

  /**
   * Obtiene el cargo fijo según la categoría
   */
  private static getCargoFijo(config: ITarifaConfig, categoria: string): number {
    switch (categoria) {
      case 'comercial': return config.cargoFijo.comercial;
      case 'industrial': return config.cargoFijo.industrial;
      case 'tercera_edad': return config.cargoFijo.terceraEdad;
      default: return config.cargoFijo.residencial;
    }
  }

  /**
   * Calcula el costo por consumo usando tarifas escalonadas
   */
  private static calcularConsumoEscalonado(
    config: ITarifaConfig,
    categoria: string,
    consumoTotal: number
  ): { costoConsumo: number; detalleEscalones: any[] } {

    console.log(`\n🔢 === CÁLCULO DE CONSUMO ESCALONADO ===`);
    console.log(`📊 Consumo total: ${consumoTotal} m³`);
    console.log(`👤 Categoría: ${categoria}`);
    console.log(`📐 Total de escalones configurados: ${config.escalones?.length || 0}`);

    if (!config.escalones || config.escalones.length === 0) {
      console.error('❌ ERROR: No hay escalones configurados en la tarifa');
      return { costoConsumo: 0, detalleEscalones: [] };
    }

    let consumoRestante = consumoTotal;
    let costoTotal = 0;
    const detalleEscalones = [];

    const escalonesOrdenados = config.escalones.sort((a, b) => a.desde - b.desde);
    console.log(`📋 Escalones ordenados:`, escalonesOrdenados.map(e => `${e.desde}-${e.hasta === -1 ? '∞' : e.hasta}`).join(', '));

    for (const escalon of escalonesOrdenados) {
      if (consumoRestante <= 0) {
        console.log(`⏹️ Consumo restante agotado, terminando cálculo`);
        break;
      }

      const limiteSuperior = escalon.hasta === -1 ? Infinity : escalon.hasta;
      const consumoEnEsteEscalon = Math.min(
        consumoRestante,
        limiteSuperior - escalon.desde + 1
      );

      console.log(`\n📍 Procesando escalón ${escalon.desde}-${escalon.hasta === -1 ? '∞' : escalon.hasta}:`);
      console.log(`   - Consumo restante: ${consumoRestante} m³`);
      console.log(`   - Consumo en este escalón: ${consumoEnEsteEscalon} m³`);

      if (consumoEnEsteEscalon > 0) {
        const tarifa = this.getTarifaEscalon(escalon, categoria);
        const costoEscalon = consumoEnEsteEscalon * tarifa;

        console.log(`   - Tarifa unitaria (${categoria}): $${tarifa}`);
        console.log(`   - Costo escalón: ${consumoEnEsteEscalon} × $${tarifa} = $${costoEscalon}`);

        costoTotal += costoEscalon;
        consumoRestante -= consumoEnEsteEscalon;

        detalleEscalones.push({
          desde: escalon.desde,
          hasta: escalon.hasta === -1 ? '∞' : escalon.hasta,
          m3Consumidos: consumoEnEsteEscalon,
          tarifaUnitaria: tarifa,
          subtotal: costoEscalon
        });
      }
    }

    console.log(`\n💰 TOTAL COSTO CONSUMO: $${costoTotal}`);
    console.log(`📊 Escalones aplicados: ${detalleEscalones.length}`);
    console.log(`🔢 === FIN CÁLCULO ESCALONADO ===\n`);

    return { costoConsumo: costoTotal, detalleEscalones };
  }

  /**
   * Obtiene la tarifa del escalón según la categoría
   */
  private static getTarifaEscalon(escalon: any, categoria: string): number {
    switch (categoria) {
      case 'comercial': return escalon.tarifaComercial;
      case 'industrial': return escalon.tarifaIndustrial;
      case 'tercera_edad': return escalon.tarifaTerceraEdad;
      default: return escalon.tarifaResidencial;
    }
  }

  /**
   * Aplica factor estacional si corresponde
   */
  private static aplicarTemporada(
    costoBase: number,
    config: ITarifaConfig,
    periodo: Date
  ): { costoConsumoConTemporada: number; temporadaAplicada?: any } {

    if (!config.temporadas || config.temporadas.length === 0) {
      return { costoConsumoConTemporada: costoBase };
    }

    const mes = periodo.getMonth() + 1; // 1-12

    for (const temporada of config.temporadas) {
      const { mesInicio, mesFin } = temporada;

      // Manejar temporadas que cruzan año (ej: Nov-Marzo)
      const dentroDeLaTemporada = mesInicio <= mesFin
        ? (mes >= mesInicio && mes <= mesFin)
        : (mes >= mesInicio || mes <= mesFin);

      if (dentroDeLaTemporada) {
        return {
          costoConsumoConTemporada: costoBase * temporada.factorMultiplicador,
          temporadaAplicada: {
            nombre: temporada.nombre,
            factor: temporada.factorMultiplicador
          }
        };
      }
    }

    return { costoConsumoConTemporada: costoBase };
  }

  /**
   * Aplica descuentos automáticos
   */
  private static async aplicarDescuentos(
    config: ITarifaConfig,
    socio: IUser,
    consumoM3: number,
    subtotal: number,
    pagoAnticipado: boolean
  ): Promise<{ montoDescuentos: number; descuentosAplicados: any[] }> {

    let montoDescuentos = 0;
    const descuentosAplicados = [];

    for (const descuento of config.descuentos.filter(d => d.activo)) {
      const cumpleCondiciones = this.verificarCondicionesDescuento(
        descuento,
        socio,
        consumoM3,
        pagoAnticipado
      );

      if (cumpleCondiciones) {
        let montoDescuento = 0;

        switch (descuento.tipo) {
          case 'porcentaje':
            montoDescuento = subtotal * (descuento.valor / 100);
            break;
          case 'monto_fijo':
            montoDescuento = descuento.valor;
            break;
          case 'consumo_minimo':
            if (consumoM3 <= descuento.valor) {
              montoDescuento = subtotal * 0.1; // 10% descuento por bajo consumo
            }
            break;
        }

        montoDescuentos += montoDescuento;
        descuentosAplicados.push({
          nombre: descuento.nombre,
          tipo: descuento.tipo,
          valor: descuento.valor,
          monto: montoDescuento
        });
      }
    }

    return { montoDescuentos, descuentosAplicados };
  }

  /**
   * Verifica si se cumplen las condiciones para un descuento
   */
  private static verificarCondicionesDescuento(
    descuento: any,
    socio: IUser,
    consumoM3: number,
    pagoAnticipado: boolean
  ): boolean {
    const { condiciones } = descuento;

    // Verificar consumo mínimo/máximo
    if (condiciones.consumoMinimo && consumoM3 < condiciones.consumoMinimo) return false;
    if (condiciones.consumoMaximo && consumoM3 > condiciones.consumoMaximo) return false;

    // Verificar categoría de usuario
    if (condiciones.categoriaUsuario &&
        !condiciones.categoriaUsuario.includes(socio.categoriaUsuario || 'residencial')) {
      return false;
    }

    // Verificar pago anticipado
    if (condiciones.pagoAnticipado && !pagoAnticipado) return false;

    return true;
  }

  /**
   * Aplica recargos por mora
   */
  private static aplicarRecargos(
    config: ITarifaConfig,
    montoBase: number,
    diasVencidos: number
  ): { montoRecargos: number; recargosAplicados: any[] } {

    const recargosAplicados = [];
    let montoRecargos = 0;

    if (diasVencidos > config.recargos.diasGracia) {
      const diasMora = diasVencidos - config.recargos.diasGracia;
      const porcentajeMora = Math.min(
        diasMora * config.recargos.porcentajeMora,
        config.recargos.porcentajeMaximo
      );

      montoRecargos = montoBase * (porcentajeMora / 100);

      recargosAplicados.push({
        concepto: 'Recargo por mora',
        valor: porcentajeMora,
        monto: montoRecargos
      });
    }

    return { montoRecargos, recargosAplicados };
  }

  /**
   * Redondea según configuración
   */
  private static redondear(monto: number, decimales: number): number {
    const factor = Math.pow(10, decimales);
    return Math.round(monto * factor) / factor;
  }

  /**
   * Simula un cálculo de tarifa para testing
   */
  static async simularCalculo(
    categoriaUsuario: string,
    consumoM3: number,
    pagoAnticipado: boolean = false
  ): Promise<CalculoTarifa | null> {
    const socioSimulado = {
      categoriaUsuario: categoriaUsuario as any,
      nombres: 'Usuario',
      apellidos: 'Simulado'
    } as IUser;

    try {
      return await this.calcularTarifa(
        socioSimulado,
        consumoM3,
        new Date(),
        0,
        pagoAnticipado
      );
    } catch (error) {
      console.error('Error en simulación de tarifa:', error);
      return null;
    }
  }
}

export default TarifaService;