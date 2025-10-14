#!/bin/bash

# ========================================
# COMANDOS CURL PARA PROBAR PAYPAL
# ========================================

# Variables de configuración
BASE_URL="http://localhost:7779"
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"

echo "=== PRUEBAS DE PAYPAL PARA PORTAL APR ==="
echo "Base URL: $BASE_URL"
echo "Swagger UI: $BASE_URL/api-docs"
echo ""

# ========================================
# 1. PRIMER PASO: OBTENER JWT TOKEN
# ========================================
echo "1. LOGIN PARA OBTENER JWT TOKEN:"
echo "curl -X POST $BASE_URL/api/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"rut\": \"12345678-9\","
echo "    \"password\": \"tu_password\","
echo "    \"tipoUsuario\": \"socio\""
echo "  }'"
echo ""
echo "Copia el token del response y reemplaza YOUR_JWT_TOKEN_HERE abajo"
echo ""

# ========================================
# 2. CREAR PAGO PAYPAL - UNA BOLETA
# ========================================
echo "2. CREAR PAGO PAYPAL (Una boleta):"
echo "curl -X POST $BASE_URL/api/paypal/create-payment \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer $JWT_TOKEN' \\"
echo "  -d '{"
echo "    \"boletaIds\": [\"507f1f77bcf86cd799439011\"]"
echo "  }'"
echo ""

# ========================================
# 3. CREAR PAGO PAYPAL - MÚLTIPLES BOLETAS
# ========================================
echo "3. CREAR PAGO PAYPAL (Múltiples boletas):"
echo "curl -X POST $BASE_URL/api/paypal/create-payment \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer $JWT_TOKEN' \\"
echo "  -d '{"
echo "    \"boletaIds\": ["
echo "      \"507f1f77bcf86cd799439011\","
echo "      \"507f1f77bcf86cd799439012\","
echo "      \"507f1f77bcf86cd799439013\""
echo "    ]"
echo "  }'"
echo ""

# ========================================
# 4. EJECUTAR PAGO PAYPAL
# ========================================
echo "4. EJECUTAR PAGO PAYPAL:"
echo "curl -X POST $BASE_URL/api/paypal/execute-payment \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer $JWT_TOKEN' \\"
echo "  -d '{"
echo "    \"paymentId\": \"PAY-1B56960729604235TKQQIYVY\","
echo "    \"PayerID\": \"TESTBUYERID\""
echo "  }'"
echo ""
echo "Nota: paymentId viene del response de create-payment"
echo "      PayerID viene de la URL de retorno de PayPal"
echo ""

# ========================================
# 5. CONSULTAR ESTADO DEL PAGO
# ========================================
echo "5. CONSULTAR ESTADO DEL PAGO:"
echo "curl -X GET $BASE_URL/api/paypal/order-status/PAY-1B56960729604235TKQQIYVY \\"
echo "  -H 'Authorization: Bearer $JWT_TOKEN'"
echo ""

# ========================================
# 6. CASOS DE ERROR
# ========================================
echo "6. CASOS DE ERROR:"
echo ""
echo "6.1 Boleta ID inválido:"
echo "curl -X POST $BASE_URL/api/paypal/create-payment \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer $JWT_TOKEN' \\"
echo "  -d '{"
echo "    \"boletaIds\": [\"invalid_id\"]"
echo "  }'"
echo ""

echo "6.2 Array vacío de boletas:"
echo "curl -X POST $BASE_URL/api/paypal/create-payment \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer $JWT_TOKEN' \\"
echo "  -d '{"
echo "    \"boletaIds\": []"
echo "  }'"
echo ""

echo "6.3 Sin PaymentID para ejecutar:"
echo "curl -X POST $BASE_URL/api/paypal/execute-payment \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer $JWT_TOKEN' \\"
echo "  -d '{"
echo "    \"PayerID\": \"TESTBUYERID\""
echo "  }'"
echo ""

# ========================================
# 7. HEALTH CHECK
# ========================================
echo "7. HEALTH CHECK:"
echo "curl -X GET $BASE_URL/health"
echo ""

# ========================================
# INSTRUCCIONES DE USO
# ========================================
echo "=== INSTRUCCIONES DE USO ==="
echo "1. Asegúrate de que el servidor esté corriendo en el puerto 7779"
echo "2. Abre Swagger UI en: $BASE_URL/api-docs"
echo "3. Primero haz login para obtener el JWT token"
echo "4. Reemplaza YOUR_JWT_TOKEN_HERE con el token real"
echo "5. Reemplaza los IDs de boletas con IDs reales de tu base de datos"
echo "6. Los comandos curl están listos para copiar y pegar"
echo ""
echo "=== NOTAS IMPORTANTES ==="
echo "- Las boletas deben existir en MongoDB y pertenecer al usuario logueado"
echo "- Las boletas deben estar en estado 'pendiente' o 'vencida'"
echo "- Para sandbox de PayPal, necesitas credenciales de prueba configuradas"
echo "- El flujo completo requiere aprobación manual en PayPal Sandbox"
echo ""