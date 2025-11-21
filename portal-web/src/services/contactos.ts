import api from './api';

export interface ContactoData {
  nombre: string;
  email: string;
  telefono?: string;
  mensaje: string;
}

export interface Contacto extends ContactoData {
  _id: string;
  estado: 'nuevo' | 'leido' | 'respondido' | 'archivado';
  notas?: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ContactosResponse {
  success: boolean;
  data: Contacto[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
  stats: {
    nuevo?: number;
    leido?: number;
    respondido?: number;
    archivado?: number;
  };
}

const contactosService = {
  // Crear contacto desde homepage (público)
  crearContacto: async (data: ContactoData) => {
    const response = await api.post('/contactos', data);
    return response.data;
  },

  // Obtener contactos (admin)
  obtenerContactos: async (estado?: string, page = 1, limit = 20) => {
    const params: any = { page, limit };
    if (estado) {
      params.estado = estado;
    }
    const response = await api.get<ContactosResponse>('/contactos', { params });
    return response.data;
  },

  // Actualizar contacto (admin)
  actualizarContacto: async (id: string, data: { estado?: string; notas?: string }) => {
    const response = await api.patch(`/contactos/${id}`, data);
    return response.data;
  },

  // Eliminar contacto (admin)
  eliminarContacto: async (id: string) => {
    const response = await api.delete(`/contactos/${id}`);
    return response.data;
  },
};

export default contactosService;
