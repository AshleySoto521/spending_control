# Configuración de Envío de Emails

Este documento explica cómo configurar el envío de emails para la funcionalidad de recuperación de contraseña.

## Tabla de Contenidos

1. [Configuración con Gmail](#configuración-con-gmail)
2. [Configuración con Outlook/Hotmail](#configuración-con-outlookhotmail)
3. [Configuración con SendGrid](#configuración-con-sendgrid)
4. [Verificar Configuración](#verificar-configuración)
5. [Solución de Problemas](#solución-de-problemas)

---

## Configuración con Gmail

Gmail es el método más común y fácil de configurar para desarrollo.

### Paso 1: Habilitar Verificación en Dos Pasos

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. En el menú lateral, selecciona **Seguridad**
3. En "Cómo iniciar sesión en Google", selecciona **Verificación en dos pasos**
4. Sigue los pasos para habilitarla (si no la tienes activada)

### Paso 2: Generar Contraseña de Aplicación

1. Una vez habilitada la verificación en dos pasos, ve a: https://myaccount.google.com/apppasswords
2. En "Seleccionar app", elige **Correo**
3. En "Seleccionar dispositivo", elige **Otro (nombre personalizado)**
4. Escribe un nombre como "Control de Gastos"
5. Haz clic en **Generar**
6. **Copia la contraseña de 16 caracteres** que aparece (sin espacios)

### Paso 3: Configurar Variables de Entorno

Actualiza tu archivo `.env` con los siguientes valores:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop  # Pega aquí la contraseña de aplicación (sin espacios)
EMAIL_FROM=noreply@controlgastos.com
```

**IMPORTANTE:**
- Usa la contraseña de aplicación generada, **NO tu contraseña normal de Gmail**
- Elimina los espacios de la contraseña de aplicación al pegarla

---

## Configuración con Outlook/Hotmail

### Variables de Entorno

```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USER=tu_email@outlook.com
EMAIL_PASS=tu_contraseña
EMAIL_FROM=noreply@controlgastos.com
```

**Nota:** Outlook puede requerir autenticación OAuth2 en algunos casos. Si tienes problemas, considera usar Gmail o SendGrid.

---

## Configuración con SendGrid

SendGrid es ideal para producción y ofrece mejor deliverability.

### Paso 1: Crear Cuenta en SendGrid

1. Registrate en https://sendgrid.com/
2. Verifica tu cuenta de email
3. Ve a **Settings** > **API Keys**
4. Crea una nueva API Key con permisos de **Mail Send**
5. Copia la API Key generada

### Paso 2: Configurar Variables de Entorno

```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey  # Siempre usa "apikey" como usuario
EMAIL_PASS=SG.tu_api_key_aqui
EMAIL_FROM=noreply@controlgastos.com
```

**Nota:** Asegúrate de verificar tu dominio en SendGrid para mejorar la deliverability.

---

## Verificar Configuración

### Prueba de Conexión SMTP

Puedes probar la conexión SMTP ejecutando:

```javascript
import { testEmailConnection } from '$lib/server/email';

// En algún endpoint de prueba o consola
const resultado = await testEmailConnection();
console.log('Conexión SMTP:', resultado ? 'Exitosa' : 'Fallida');
```

### Probar Envío de Email

1. Inicia la aplicación en desarrollo
2. Ve a la página de "Olvidé mi contraseña"
3. Ingresa un email registrado
4. Verifica:
   - La consola del servidor para ver el link generado
   - Tu bandeja de entrada para el email

---

## Solución de Problemas

### Error: "Invalid login"

**Causa:** Credenciales incorrectas o contraseña de aplicación no generada.

**Solución:**
- Verifica que estás usando la contraseña de aplicación de Gmail (no tu contraseña normal)
- Asegúrate de que la verificación en dos pasos esté habilitada

### Error: "Connection timeout"

**Causa:** Firewall bloqueando puerto 587 o configuración de host incorrecta.

**Solución:**
- Verifica que `EMAIL_HOST` y `EMAIL_PORT` sean correctos
- Intenta con puerto 465 (secure: true) en lugar de 587
- Verifica que tu firewall permita conexiones SMTP salientes

### Emails no llegan (aunque no hay error)

**Causa:** Los emails pueden estar yendo a spam o siendo rechazados.

**Solución:**
- Revisa la carpeta de spam
- Verifica que `EMAIL_FROM` use un dominio válido
- Para producción, usa un servicio profesional como SendGrid
- Verifica SPF y DKIM records si usas tu propio dominio

### Error: "self signed certificate in certificate chain"

**Causa:** Problemas con certificados SSL.

**Solución:**
```javascript
// En email.ts, agregar a la configuración:
{
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false  // Solo para desarrollo
  }
}
```

**ADVERTENCIA:** Solo usa `rejectUnauthorized: false` en desarrollo, nunca en producción.

---

## Producción

### Recomendaciones para Producción

1. **Usa un servicio profesional:** SendGrid, Mailgun, Amazon SES, etc.
2. **Verifica tu dominio:** Configura SPF, DKIM y DMARC
3. **Usa variables de entorno:** Nunca expongas credenciales en el código
4. **Monitorea deliverability:** Usa el dashboard del proveedor
5. **Implementa rate limiting:** Evita abuso del endpoint de recuperación

### Variables de Entorno en Producción

Asegúrate de configurar estas variables en tu plataforma de hosting (Vercel, Railway, etc.):

```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=SG.tu_api_key_produccion
EMAIL_FROM=noreply@tudominio.com
APP_URL=https://tudominio.com
NODE_ENV=production
```

---

## Recursos Adicionales

- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SendGrid Documentation](https://docs.sendgrid.com/)
- [SMTP Testing Tool](https://www.smtper.net/)
