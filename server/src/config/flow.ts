import crypto from "crypto";

interface FlowConfig {
  apiKey: string;
  secretKey: string;
  environment: "sandbox" | "production";
  apiUrl: string;
}

interface FlowPaymentResponse {
  url: string;
  token: string;
  flowOrder?: number;
}

interface FlowPaymentStatus {
  flowOrder: number;
  commerceOrder: string;
  requestDate: string;
  status: number; // 1=pending, 2=paid, 3=rejected, 4=cancelled
  subject: string;
  currency: string;
  amount: number;
  payer: string;
  optional?: Record<string, any>;
  pending_info?: {
    media: string;
    date: string;
  };
  paymentData?: {
    date: string;
    media: string;
    conversionDate: string;
    conversionRate: number;
    amount: number;
    currency: string;
    fee: number;
    balance: number;
    transferDate: string;
  };
  merchantId?: string;
}

class FlowClient {
  private config: FlowConfig;

  constructor() {
    this.config = {
      apiKey: process.env.FLOW_API_KEY || "",
      secretKey: process.env.FLOW_SECRET_KEY || "",
      environment:
        (process.env.FLOW_ENVIRONMENT as "sandbox" | "production") || "sandbox",
      apiUrl: process.env.FLOW_API_URL || "https://sandbox.flow.cl/api",
    };

    if (!this.config.apiKey || !this.config.secretKey) {
      console.warn(
        "⚠️  Flow credentials not configured. Payment processing will fail."
      );
    } else {
      console.log(
        `✅ Flow client initialized in ${this.config.environment} mode`
      );
    }
  }

  /**
   * Generate signature for Flow API requests
   */
  private generateSignature(params: Record<string, any>): string {
    // Sort parameters alphabetically
    const sortedKeys = Object.keys(params).sort();
    const paramsString = sortedKeys
      .map((key) => `${key}${params[key]}`)
      .join("");

    // Create HMAC signature
    const signature = crypto
      .createHmac("sha256", this.config.secretKey)
      .update(paramsString)
      .digest("hex");

    return signature;
  }

  /**
   * Create a Flow payment
   */
  async createPayment(params: {
    commerceOrder: string;
    subject: string;
    amount: number;
    email: string;
    urlConfirmation: string;
    urlReturn: string;
    optional?: Record<string, any>;
  }): Promise<FlowPaymentResponse> {
    try {
      const paymentParams: Record<string, any> = {
        apiKey: this.config.apiKey,
        commerceOrder: params.commerceOrder,
        subject: params.subject,
        amount: Math.round(params.amount), // Flow requires integer amounts
        email: params.email,
        urlConfirmation: params.urlConfirmation,
        urlReturn: params.urlReturn,
      };

      // Add optional parameters
      if (params.optional) {
        Object.assign(paymentParams, params.optional);
      }

      // Generate signature
      const signature = this.generateSignature(paymentParams);
      paymentParams.s = signature;

      // Make request to Flow API
      const url = `${this.config.apiUrl}/payment/create`;
      const formBody = new URLSearchParams(paymentParams).toString();

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Flow API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as FlowPaymentResponse;

      // Ensure the URL includes the token parameter
      if (data.url && data.token && !data.url.includes("token=")) {
        data.url = `${data.url}?token=${data.token}`;
      }

      return data;
    } catch (error) {
      console.error("❌ Flow createPayment error:", error);
      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(token: string): Promise<FlowPaymentStatus> {
    try {
      const params: Record<string, any> = {
        apiKey: this.config.apiKey,
        token,
      };

      const signature = this.generateSignature(params);
      params.s = signature;

      const url = `${this.config.apiUrl}/payment/getStatus`;
      const formBody = new URLSearchParams(params).toString();

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Flow API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as FlowPaymentStatus;
      return data;
    } catch (error) {
      console.error("❌ Flow getPaymentStatus error:", error);
      throw error;
    }
  }

  /**
   * Verify signature from Flow webhook/confirmation
   */
  verifySignature(
    params: Record<string, any>,
    receivedSignature: string
  ): boolean {
    const calculatedSignature = this.generateSignature(params);
    return calculatedSignature === receivedSignature;
  }

  getConfig() {
    return {
      apiKey: this.config.apiKey,
      environment: this.config.environment,
      apiUrl: this.config.apiUrl,
    };
  }
}

export const flowClient = new FlowClient();
export type { FlowPaymentResponse, FlowPaymentStatus };
