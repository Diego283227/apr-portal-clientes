import axios from "axios";
import type { PaymentMethod } from "@/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:7781/api";

interface PaymentMethodsResponse {
  success: boolean;
  data: PaymentMethod[];
  message: string;
}

class PaymentService {
  private getAuthToken(): string | null {
    return localStorage.getItem("token");
  }

  private getAuthHeaders() {
    const token = this.getAuthToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  // Get available payment methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      // For now, return mock data since we haven't implemented the backend endpoint yet
      // In a real implementation, this would fetch from /api/payment-methods
      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: "webpay",
          nombre: "WebPay Plus",
          tipo: "webpay",
          activo: true,
          configuracion: {
            environment: "sandbox",
          },
        },
        {
          id: "paypal",
          nombre: "PayPal",
          tipo: "paypal",
          activo: true,
          configuracion: {
            environment: "sandbox",
            clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "test",
          },
        },
        {
          id: "mercadopago",
          nombre: "MercadoPago",
          tipo: "mercadopago",
          activo: true,
          configuracion: {
            environment: "sandbox",
          },
        },
        {
          id: "flow",
          nombre: "Flow",
          tipo: "flow",
          activo: false, // Disabled for demo
          configuracion: {},
        },
        {
          id: "transferencia",
          nombre: "Transferencia Bancaria",
          tipo: "transferencia",
          activo: true,
          configuracion: {
            banco: "Banco de Chile",
            cuenta: "123456789",
            rut: "12345678-9",
          },
        },
      ];

      return mockPaymentMethods;
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      throw new Error("Error al obtener métodos de pago");
    }
  }

  // Process payment
  async processPayment(paymentData: {
    boletaIds: string[];
    metodoPago: string;
    total: number;
  }) {
    try {
      // If MercadoPago is selected, use the specialized endpoint
      if (paymentData.metodoPago === "mercadopago") {
        return this.createMercadoPagoPreference({
          boletaIds: paymentData.boletaIds,
        });
      }

      // If Flow is selected, use the specialized endpoint
      if (paymentData.metodoPago === "flow") {
        return this.createFlowPayment({
          boletaIds: paymentData.boletaIds,
        });
      }

      const response = await axios.post(`${API_BASE_URL}/pagos`, paymentData, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error("Error processing payment:", error);
      throw error;
    }
  }

  // Create MercadoPago preference
  async createMercadoPagoPreference(data: { boletaIds: string[] }) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/mercadopago/create-preference`,
        data,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error("Error creating MercadoPago preference:", error);
      throw error;
    }
  }

  // Create Flow payment
  async createFlowPayment(data: { boletaIds: string[] }) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/flow/create-payment`,
        data,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error("Error creating Flow payment:", error);
      throw error;
    }
  }

  // Get payment history
  async getPaymentHistory(page: number = 1, limit: number = 10) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/pagos/history?page=${page}&limit=${limit}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching payment history:", error);
      throw error;
    }
  }

  // Get payment details
  async getPaymentDetails(paymentId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/pagos/${paymentId}`, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching payment details:", error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
