import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  ArrowLeft,
  CreditCard,
  Receipt,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Banknote,
  Shield,
  Info,
  Wallet,
  Clock,
  DollarSign,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useBoletas } from "@/hooks/useBoletas";
import MercadoPagoDirect from "@/components/payment/MercadoPagoDirect";
import { apiClient } from "@/services/api";

interface SocioPagoViewProps {
  socio: any;
  selectedBoletaIds: string[];
  onBack: () => void;
  onPaymentComplete: (paymentData: any) => void;
}

const SocioPagoView: React.FC<SocioPagoViewProps> = ({
  socio,
  selectedBoletaIds,
  onBack,
  onPaymentComplete,
}) => {
  const { boletas } = useBoletas();
  const [selectedBoletas, setSelectedBoletas] =
    useState<string[]>(selectedBoletaIds);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    string | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMercadoPagoCheckout, setShowMercadoPagoCheckout] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-CL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleBoletaToggle = (boletaId: string, checked: boolean) => {
    if (checked) {
      setSelectedBoletas((prev) => [...prev, boletaId]);
    } else {
      setSelectedBoletas((prev) => prev.filter((id) => id !== boletaId));
    }
  };

  const getSelectedBoletasData = () => {
    return boletas.filter((boleta) => selectedBoletas.includes(boleta.id));
  };

  const getTotalAmount = () => {
    return getSelectedBoletasData().reduce(
      (sum, boleta) => sum + boleta.montoTotal,
      0
    );
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pagada":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Pagada
          </Badge>
        );
      case "vencida":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Vencida
          </Badge>
        );
      case "pendiente":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pendiente
          </Badge>
        );
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const paymentMethods = [
    {
      id: "flow",
      name: "Flow",
      description: "Pago seguro con Flow Chile",
      icon: CreditCard,
      features: [
        "Tarjetas de crédito y débito",
        "Transferencia bancaria",
        "Rápido y seguro",
      ],
      comingSoon: false,
      available: true,
      recommended: true,
    },
    {
      id: "mercadopago",
      name: "Mercado Pago",
      description: "Pago seguro con Mercado Pago",
      icon: Wallet,
      features: [
        "Tarjetas de crédito y débito",
        "Medios de pago chilenos",
        "Máxima seguridad",
      ],
      comingSoon: false,
      available: true,
      recommended: false,
    },
    {
      id: "webpay",
      name: "WebPay Plus",
      description: "Pago seguro con tarjetas chilenas",
      icon: Shield,
      features: [
        "Tarjetas de crédito chilenas",
        "Tarjetas de débito",
        "Máxima seguridad",
      ],
      comingSoon: true,
      available: false,
    },
    {
      id: "transfer",
      name: "Transferencia Bancaria",
      description: "Transfiere desde tu banco",
      icon: Banknote,
      features: [
        "Desde cualquier banco",
        "Sin comisiones adicionales",
        "Validación automática",
      ],
      comingSoon: true,
      available: false,
    },
  ];

  const handleProceedToPayment = async () => {
    if (!selectedPaymentMethod || selectedBoletas.length === 0) {
      return;
    }

    setIsProcessing(true);

    try {
      if (selectedPaymentMethod === "flow") {
        // Redirect to Flow payment
        const response = await apiClient.post("/flow/create-payment", {
          boletaIds: selectedBoletas,
        });

        if (response.data.success && response.data.data.paymentUrl) {
          window.location.href = response.data.data.paymentUrl;
        } else {
          toast.error("Error al crear el pago de Flow");
        }
        return;
      }

      if (selectedPaymentMethod === "mercadopago") {
        // Mostrar el componente Mercado Pago
        setShowMercadoPagoCheckout(true);
        toast.info("Preparando pago con Mercado Pago...", {
          description: "Se mostrará la opción de pago de Mercado Pago",
        });
        return;
      }

      // Otros métodos de pago están temporalmente deshabilitados
      toast.error("Método de pago temporalmente no disponible");
    } catch (error) {
      console.error("Error al procesar pago:", error);
      toast.error("Error al procesar el pago", {
        description: "Ocurrió un error inesperado. Intenta nuevamente.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMercadoPagoSuccess = async (details: any) => {
    console.log("Mercado Pago payment success:", details);

    toast.success("¡Pago exitoso!", {
      description: `Transacción ID: ${details.id}`,
      duration: 5000,
    });

    // El backend ya maneja automáticamente la actualización de boletas
    console.log(
      "✅ Payment completed - backend will auto-update boleta status"
    );

    // Completar el procesamiento del pago
    onPaymentComplete({
      paymentId: details.id,
      amount: getTotalAmount(),
      boletas: selectedBoletas,
      status: "completed",
      method: "mercadopago",
    });
  };

  const handleMercadoPagoError = (error: any) => {
    console.error("Mercado Pago payment error:", error);
    toast.error("Error en el pago", {
      description: "Ha ocurrido un error procesando el pago con Mercado Pago",
    });
    setShowMercadoPagoCheckout(false);
  };

  const handleMercadoPagoCancel = () => {
    console.log("Mercado Pago payment cancelled");
    toast.info("Pago cancelado", {
      description: "El pago fue cancelado por el usuario",
    });
    setShowMercadoPagoCheckout(false);
  };

  const availableBoletas = boletas.filter(
    (boleta) => boleta.estado === "pendiente" || boleta.estado === "vencida"
  );

  return (
    <div className="p-6 max-w-6xl mx-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mr-4">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Realizar Pago</h1>
          <p className="text-gray-600">
            Selecciona las boletas y método de pago para {socio.nombres}{" "}
            {socio.apellidos}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Boletas Selection and Payment Methods */}
        <div className="lg:col-span-2 space-y-6">
          {/* Boletas Disponibles */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                <CardTitle>Boletas Pendientes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableBoletas.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    ¡Felicidades! Estás al día
                  </h3>
                  <p className="text-gray-600">
                    No tienes boletas pendientes de pago.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="select-all"
                        checked={
                          selectedBoletas.length === availableBoletas.length
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBoletas(
                              availableBoletas.map((b) => b.id)
                            );
                          } else {
                            setSelectedBoletas([]);
                          }
                        }}
                      />
                      <label
                        htmlFor="select-all"
                        className="text-sm font-medium text-blue-900"
                      >
                        Seleccionar todas ({availableBoletas.length} boletas)
                      </label>
                    </div>
                    <div className="text-sm text-blue-800 font-medium">
                      Total:{" "}
                      {formatCurrency(
                        availableBoletas.reduce(
                          (sum, b) => sum + b.montoTotal,
                          0
                        )
                      )}
                    </div>
                  </div>

                  {availableBoletas.map((boleta) => (
                    <div
                      key={boleta.id}
                      className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <Checkbox
                        id={boleta.id}
                        checked={selectedBoletas.includes(boleta.id)}
                        onCheckedChange={(checked) =>
                          handleBoletaToggle(boleta.id, checked as boolean)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-900">
                            Boleta {boleta.numeroBoleta}
                          </h4>
                          {getEstadoBadge(boleta.estado)}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                          <div>
                            <span className="font-medium">Período:</span>{" "}
                            {boleta.periodo}
                          </div>
                          <div>
                            <span className="font-medium">Consumo:</span>{" "}
                            {boleta.consumoM3} m³
                          </div>
                          <div>
                            <span className="font-medium">Vencimiento:</span>{" "}
                            {formatDate(boleta.fechaVencimiento)}
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-blue-600">
                              {formatCurrency(boleta.montoTotal)}
                            </span>
                          </div>
                        </div>
                        {boleta.estado === "vencida" && (
                          <div className="flex items-center gap-1 text-red-600 text-xs">
                            <Clock className="h-3 w-3" />
                            Boleta vencida - Pueden aplicar recargos
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {selectedBoletas.length === 0 && availableBoletas.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Selecciona al menos una boleta para continuar con el pago.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          {selectedBoletas.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  <CardTitle>Método de Pago</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon;
                  const isDisabled = !method.available;

                  return (
                    <div
                      key={method.id}
                      className={`relative p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedPaymentMethod === method.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-600"
                          : isDisabled
                          ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() =>
                        method.available && setSelectedPaymentMethod(method.id)
                      }
                    >
                      {method.recommended && method.available && (
                        <Badge className="absolute -top-2 -right-2 bg-green-500">
                          Recomendado
                        </Badge>
                      )}
                      {method.comingSoon && (
                        <Badge
                          variant="outline"
                          className="absolute -top-2 -right-2"
                        >
                          Próximamente
                        </Badge>
                      )}

                      <div className="flex items-start gap-4">
                        <div
                          className={`p-2 rounded-lg ${
                            selectedPaymentMethod === method.id
                              ? "bg-blue-100 dark:bg-blue-900"
                              : "bg-gray-100 dark:bg-gray-700"
                          }`}
                        >
                          <IconComponent
                            className={`h-6 w-6 ${
                              selectedPaymentMethod === method.id
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-600 dark:text-gray-300"
                            }`}
                          />
                        </div>

                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {method.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {method.description}
                          </p>

                          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                            {method.features.map((feature, index) => (
                              <li
                                key={index}
                                className="flex items-center gap-1"
                              >
                                <CheckCircle2 className="h-3 w-3 text-green-500 dark:text-green-400" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {selectedPaymentMethod === method.id && (
                          <div className="flex-shrink-0">
                            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Payment Summary */}
        {selectedBoletas.length > 0 && (
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card className="sticky top-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  <CardTitle>Resumen de Pago</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Socio Info */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <Receipt className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {socio.nombres} {socio.apellidos}
                      </p>
                      <p className="text-xs text-gray-600">
                        Código: {socio.codigoSocio}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Selected boletas summary */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">
                    Boletas seleccionadas ({selectedBoletas.length}):
                  </h4>
                  {getSelectedBoletasData().map((boleta) => (
                    <div
                      key={boleta.id}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-600">
                        {boleta.numeroBoleta} - {boleta.periodo}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(boleta.montoTotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Total */}
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total a Pagar:</span>
                  <span className="text-blue-600 flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(getTotalAmount())}
                  </span>
                </div>

                {/* Payment button(s) - Conditional rendering */}
                {selectedPaymentMethod === "mercadopago" ? (
                  // Mostrar componente de Mercado Pago directamente
                  <div className="space-y-3">
                    <MercadoPagoDirect
                      amount={getTotalAmount()}
                      currency="CLP"
                      description={`Pago boletas - ${socio.nombres} ${socio.apellidos}`}
                      boletaIds={selectedBoletas}
                      onSuccess={handleMercadoPagoSuccess}
                      onError={handleMercadoPagoError}
                      onCancel={handleMercadoPagoCancel}
                    />
                  </div>
                ) : selectedPaymentMethod === "flow" ? (
                  // Botón para Flow
                  <Button
                    onClick={handleProceedToPayment}
                    disabled={selectedBoletas.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Pagar con Flow
                  </Button>
                ) : selectedPaymentMethod === "paypal" ? (
                  // Botón para mostrar PayPal
                  <Button
                    onClick={handleProceedToPayment}
                    disabled={selectedBoletas.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    <Wallet className="h-5 w-5 mr-2" />
                    Pagar con PayPal
                  </Button>
                ) : (
                  // Botón genérico para otros métodos
                  <Button
                    onClick={handleProceedToPayment}
                    disabled={
                      selectedBoletas.length === 0 || !selectedPaymentMethod
                    }
                    className="w-full"
                    size="lg"
                  >
                    <>
                      {selectedPaymentMethod === "webpay" &&
                        "Pagar con WebPay (Próximamente)"}
                      {selectedPaymentMethod === "transfer" &&
                        "Pagar con Transferencia (Próximamente)"}
                      {selectedPaymentMethod === "efectivo" &&
                        "Pagar en Efectivo (Próximamente)"}
                      {!selectedPaymentMethod && "Selecciona método de pago"}
                    </>
                  </Button>
                )}

                {/* Security and Help info */}
                <div className="space-y-3 pt-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                      <div className="text-xs text-green-800">
                        <p className="font-medium mb-1">Pago 100% Seguro</p>
                        <p>
                          Todos los pagos son procesados de forma segura y
                          encriptada.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-xs text-blue-800">
                        <p className="font-medium mb-1">¿Necesitas ayuda?</p>
                        <p>
                          Contacta a soporte si tienes problemas con el pago.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mercado Pago Checkout Section */}
        {showMercadoPagoCheckout && selectedPaymentMethod === "mercadopago" && (
          <div className="lg:col-span-3">
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 h-5 text-blue-600 dark:text-blue-400" />
                    Pagar con Mercado Pago
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMercadoPagoCheckout(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Resumen del Pago
                    </h4>
                    <div className="space-y-2 mb-4">
                      {getSelectedBoletasData().map((boleta) => (
                        <div
                          key={boleta.id}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-gray-600 dark:text-gray-300">
                            Boleta {boleta.numeroBoleta}
                          </span>
                          <span className="font-medium dark:text-gray-100">
                            {formatCurrency(boleta.montoTotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold border-t dark:border-gray-700 pt-2">
                      <span className="dark:text-gray-100">Total:</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {formatCurrency(getTotalAmount())}
                      </span>
                    </div>
                  </div>

                  <div>
                    <MercadoPagoDirect
                      amount={getTotalAmount()}
                      currency="CLP"
                      description={`Pago boletas - ${socio.nombres} ${socio.apellidos}`}
                      boletaIds={selectedBoletas}
                      onSuccess={handleMercadoPagoSuccess}
                      onError={handleMercadoPagoError}
                      onCancel={handleMercadoPagoCancel}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocioPagoView;
