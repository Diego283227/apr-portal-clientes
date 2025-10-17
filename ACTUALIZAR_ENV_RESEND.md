# Actualizar Variables de Entorno para Resend

## Cambios Necesarios en el Servidor

Necesitas actualizar el archivo `.env` en el servidor VPS con las nuevas variables de Resend.

### 1. Conectarte al servidor

```bash
ssh root@145.223.26.119
cd /root/portal-online
```

### 2. Editar el archivo .env

```bash
nano .env
```

### 3. Reemplazar las variables de EMAIL

**ELIMINAR estas líneas:**
```
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=resend
EMAIL_PASS=re_E7iau5FH_AcpJizpfZXv8FBXb6xXMk2rg
EMAIL_FROM=onboarding@resend.dev
```

**AGREGAR estas líneas:**
```
EMAIL_ENABLED=true
RESEND_API_KEY=re_E7iau5FH_AcpJizpfZXv8FBXb6xXMk2rg
```

### 4. Guardar y salir
- Presiona `Ctrl + O` para guardar
- Presiona `Enter` para confirmar
- Presiona `Ctrl + X` para salir

### 5. Reiniciar el contenedor

```bash
docker compose restart server
```

### 6. Verificar los logs

```bash
docker compose logs -f server
```

Deberías ver:
```
📧 Email service initialized with Resend (Production)
```

## ¿Por qué este cambio?

- **Antes**: Usábamos Nodemailer con SMTP de Resend (menos confiable)
- **Ahora**: Usamos la SDK oficial de Resend (más confiable, mejor deliverability)

La SDK de Resend tiene mejor compatibilidad con todos los proveedores de email (Gmail, Outlook, Yahoo, etc.) y maneja automáticamente la reputación del remitente.
