import { Request, Response } from 'express';
import Contacto from '../models/Contacto';

// @desc    Crear nuevo contacto desde homepage
// @route   POST /api/contactos
// @access  Public
export const crearContacto = async (req: Request, res: Response) => {
  try {
    const { nombre, email, telefono, mensaje } = req.body;

    // Validaciones
    if (!nombre || !email || !mensaje) {
      return res.status(400).json({
        success: false,
        message: 'Por favor completa todos los campos requeridos',
      });
    }

    // Crear contacto
    const contacto = await Contacto.create({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      telefono: telefono?.trim(),
      mensaje: mensaje.trim(),
      estado: 'nuevo',
    });

    res.status(201).json({
      success: true,
      message: 'Mensaje enviado correctamente. Nos contactaremos contigo pronto.',
      data: {
        id: contacto._id,
      },
    });
  } catch (error: any) {
    console.error('❌ Error al crear contacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar el mensaje. Por favor intenta nuevamente.',
      error: error.message,
    });
  }
};

// @desc    Obtener todos los contactos (Admin)
// @route   GET /api/contactos
// @access  Private/Admin
export const obtenerContactos = async (req: Request, res: Response) => {
  try {
    const { estado, page = 1, limit = 20 } = req.query;

    const filter: any = {};
    if (estado) {
      filter.estado = estado;
    }

    const contactos = await Contacto.find(filter)
      .sort({ creadoEn: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Contacto.countDocuments(filter);

    // Contar por estado
    const stats = await Contacto.aggregate([
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 },
        },
      },
    ]);

    const estadoStats = stats.reduce((acc: any, curr: any) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: contactos,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
      stats: estadoStats,
    });
  } catch (error: any) {
    console.error('❌ Error al obtener contactos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener contactos',
      error: error.message,
    });
  }
};

// @desc    Actualizar estado/notas de contacto
// @route   PATCH /api/contactos/:id
// @access  Private/Admin
export const actualizarContacto = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado, notas } = req.body;

    const contacto = await Contacto.findById(id);

    if (!contacto) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado',
      });
    }

    if (estado) {
      contacto.estado = estado;
    }

    if (notas !== undefined) {
      contacto.notas = notas;
    }

    await contacto.save();

    res.json({
      success: true,
      message: 'Contacto actualizado correctamente',
      data: contacto,
    });
  } catch (error: any) {
    console.error('❌ Error al actualizar contacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar contacto',
      error: error.message,
    });
  }
};

// @desc    Eliminar contacto
// @route   DELETE /api/contactos/:id
// @access  Private/Admin
export const eliminarContacto = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contacto = await Contacto.findByIdAndDelete(id);

    if (!contacto) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Contacto eliminado correctamente',
    });
  } catch (error: any) {
    console.error('❌ Error al eliminar contacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar contacto',
      error: error.message,
    });
  }
};
