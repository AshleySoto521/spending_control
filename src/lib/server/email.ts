import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '$env/dynamic/private';

/**
 * Igual que en `db.ts` y `cookies.ts`: recorta comentarios en línea y espacios.
 *
 * Este módulo era el único que leía el entorno en crudo, y el `.env` del
 * proyecto sí usa comentarios al final de la línea. Si `NODE_ENV` llegaba como
 * `production  # ...`, la comparación con 'production' fallaba y la
 * verificación del certificado TLS del servidor SMTP quedaba desactivada: con
 * eso, quien se interponga en la red lee la contraseña de la cuenta de correo
 * y los enlaces de recuperación que se están enviando.
 */
function limpiar(valor: string | undefined): string | undefined {
	if (valor === undefined || valor === null) return undefined;
	const limpio = String(valor).split('#')[0].trim();
	return limpio === '' ? undefined : limpio;
}

const EMAIL_HOST = limpiar(env.EMAIL_HOST);
const EMAIL_PORT = limpiar(env.EMAIL_PORT);
const EMAIL_USER = limpiar(env.EMAIL_USER);
const EMAIL_PASS = limpiar(env.EMAIL_PASS);
const EMAIL_FROM = limpiar(env.EMAIL_FROM);
const esProduccion = limpiar(env.NODE_ENV) === 'production';

/**
 * Escotilla de escape explícita para un servidor SMTP interno con certificado
 * autofirmado. Fuera de ese caso no debe activarse: desactivar la verificación
 * reabre la puerta a un intermediario.
 */
const tlsInseguroPermitido = limpiar(env.EMAIL_TLS_INSECURE) === 'true';

// Configuración del transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
	if (!transporter) {
		if (tlsInseguroPermitido) {
			console.warn(
				'[email] EMAIL_TLS_INSECURE=true: la verificación del certificado SMTP está DESACTIVADA.'
			);
		}

		const config = {
			host: EMAIL_HOST || 'smtp.gmail.com',
			port: Number.parseInt(EMAIL_PORT || '587', 10) || 587,
			secure: false, // true para 465, false para otros puertos
			auth: {
				user: EMAIL_USER,
				pass: EMAIL_PASS
			},
			// La verificación del certificado está activa siempre salvo que se
			// pida lo contrario de forma explícita. Antes dependía de que
			// NODE_ENV valiera exactamente 'production'.
			tls: {
				rejectUnauthorized: !tlsInseguroPermitido
			},
			// Timeout más largo
			connectionTimeout: 10000,
			greetingTimeout: 10000,
			socketTimeout: 10000,
			// Debug en desarrollo
			debug: !esProduccion,
			logger: !esProduccion
		};

		if (!esProduccion) {
			console.log('Configurando transporter de email:', {
				host: config.host,
				port: config.port,
				user: config.auth.user,
				secure: config.secure
			});
		}

		transporter = nodemailer.createTransport(config);
	}
	return transporter;
}

/**
 * Error de nodemailer.
 *
 * Trae campos propios del protocolo SMTP —`code`, `command`, `response`— que no
 * están en `Error` y que son justo lo que sirve para diagnosticar un fallo de
 * envío: distinguir un rechazo de autenticación de un buzón inexistente.
 */
interface ErrorSmtp extends Error {
	code?: string;
	command?: string;
	response?: string;
}

function detallesSmtp(error: unknown): ErrorSmtp {
	return error instanceof Error ? (error as ErrorSmtp) : new Error(String(error));
}

/**
 * Escapa el texto que se interpola en la plantilla HTML del correo.
 * `nombre` lo elige la propia persona al registrarse y no se filtra en ningún
 * punto, así que sin escapar podría romper el marcado del mensaje.
 */
function escaparHtml(valor: string): string {
	return valor
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// Plantilla de email para recuperación de contraseña
function getResetPasswordTemplate(nombreSinEscapar: string, resetLink: string): string {
	const nombre = escaparHtml(nombreSinEscapar);
	return `
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Recuperación de Contraseña</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			line-height: 1.6;
			color: #333;
			max-width: 600px;
			margin: 0 auto;
			padding: 20px;
			background-color: #f5f5f5;
		}
		.container {
			background-color: #ffffff;
			border-radius: 8px;
			padding: 40px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		}
		.header {
			text-align: center;
			margin-bottom: 30px;
		}
		h1 {
			color: #1f2937;
			font-size: 24px;
			margin-bottom: 10px;
		}
		.content {
			margin-bottom: 30px;
		}
		.button {
			display: inline-block;
			padding: 12px 30px;
			background-color: #1f2937;
			color: #ffffff !important;
			text-decoration: none;
			border-radius: 6px;
			font-weight: 600;
			text-align: center;
			margin: 20px 0;
		}
		.button:hover {
			background-color: #374151;
		}
		.link {
			color: #6b7280;
			font-size: 14px;
			word-break: break-all;
			margin: 20px 0;
			padding: 15px;
			background-color: #f9fafb;
			border-radius: 4px;
			border: 1px solid #e5e7eb;
		}
		.footer {
			margin-top: 30px;
			padding-top: 20px;
			border-top: 1px solid #e5e7eb;
			text-align: center;
			color: #6b7280;
			font-size: 14px;
		}
		.warning {
			margin-top: 20px;
			padding: 15px;
			background-color: #fef3c7;
			border-left: 4px solid #f59e0b;
			border-radius: 4px;
		}
		.warning p {
			margin: 0;
			color: #92400e;
			font-size: 14px;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Recuperación de Contraseña</h1>
		</div>

		<div class="content">
			<p>Hola <strong>${nombre}</strong>,</p>
			<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Control de Gastos</strong>.</p>
			<p>Si realizaste esta solicitud, haz clic en el siguiente botón para crear una nueva contraseña:</p>

			<div style="text-align: center;">
				<a href="${resetLink}" class="button">Restablecer Contraseña</a>
			</div>

			<p>O copia y pega este enlace en tu navegador:</p>
			<div class="link">
				${resetLink}
			</div>

			<div class="warning">
				<p><strong>⚠️ Importante:</strong> Este enlace expirará en <strong>1 hora</strong> por razones de seguridad.</p>
			</div>

			<p style="margin-top: 20px;">Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura. Tu contraseña no será cambiada.</p>
		</div>

		<div class="footer">
			<p>Este es un correo automático, por favor no respondas.</p>
			<p>&copy; ${new Date().getFullYear()} Control de Gastos. Todos los derechos reservados.</p>
		</div>
	</div>
</body>
</html>
	`.trim();
}

// Función para enviar email de recuperación de contraseña
export async function sendResetPasswordEmail(
	email: string,
	nombre: string,
	resetLink: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
	try {
		// El destinatario y su nombre solo se registran en desarrollo: en
		// producción los logs de la función persisten y esto es información
		// personal de quien está recuperando su cuenta.
		if (!esProduccion) {
			console.log('=== Iniciando envío de email ===');
			console.log('Destinatario:', email);
			console.log('Nombre:', nombre);
		}

		// Validar configuración de email
		if (!EMAIL_USER || !EMAIL_PASS) {
			console.error(
				'❌ Configuración de email incompleta. Verifica EMAIL_USER y EMAIL_PASS en .env'
			);
			return {
				success: false,
				error: 'Configuración de email no disponible'
			};
		}

		const transport = getTransporter();

		const mailOptions = {
			from: `"Control de Gastos" <${EMAIL_FROM || EMAIL_USER}>`,
			to: email,
			subject: 'Recuperación de Contraseña - Control de Gastos',
			html: getResetPasswordTemplate(nombre, resetLink)
		};

		const info = await transport.sendMail(mailOptions);

		if (!esProduccion) {
			console.log('✓ Email enviado exitosamente');
			console.log('Message ID:', info.messageId);
			console.log('Response:', info.response);
		}

		return {
			success: true,
			messageId: info.messageId
		};
	} catch (errorCrudo) {
		const error = detallesSmtp(errorCrudo);
		console.error('❌ Error al enviar email:', error.message);
		console.error('Código de error:', error.code);
		console.error('Comando:', error.command);

		if (error.response) {
			console.error('Respuesta del servidor:', error.response);
		}

		return {
			success: false,
			error: error.message || 'Error al enviar email'
		};
	}
}

/**
 * Plantilla del recordatorio de inactividad.
 *
 * Deliberadamente sin cifras: ni saldos, ni deudas, ni movimientos. El correo
 * es un canal que la aplicación no controla —se reenvía, se lee en bandejas
 * compartidas, se queda en cuentas que alguien puede comprometer— y un aviso
 * de «vuelve a registrar tus gastos» no necesita exponer la situación
 * financiera de nadie para cumplir su función.
 */
function getRecordatorioTemplate(
	nombreSinEscapar: string,
	dias: number,
	appUrl: string,
	bajaUrl: string
): string {
	const nombre = escaparHtml(nombreSinEscapar);

	return `
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Te extrañamos en Control de Gastos</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			line-height: 1.6;
			color: #333;
			max-width: 600px;
			margin: 0 auto;
			padding: 20px;
			background-color: #f5f5f5;
		}
		.container {
			background-color: #ffffff;
			border-radius: 8px;
			padding: 40px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		}
		.header { text-align: center; margin-bottom: 30px; }
		h1 { color: #1f2937; font-size: 24px; margin-bottom: 10px; }
		.content { margin-bottom: 30px; }
		.button {
			display: inline-block;
			padding: 12px 30px;
			background-color: #1f2937;
			color: #ffffff !important;
			text-decoration: none;
			border-radius: 6px;
			font-weight: 600;
			text-align: center;
			margin: 20px 0;
		}
		.footer {
			margin-top: 30px;
			padding-top: 20px;
			border-top: 1px solid #e5e7eb;
			text-align: center;
			color: #6b7280;
			font-size: 13px;
		}
		.footer a { color: #6b7280; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Hace ${dias} días que no nos vemos</h1>
		</div>

		<div class="content">
			<p>Hola <strong>${nombre}</strong>,</p>
			<p>
				Han pasado ${dias} días desde la última vez que entraste a
				<strong>Control de Gastos</strong>. Si dejaste movimientos sin registrar,
				ponerte al día toma unos minutos y evita que se te pase una fecha de pago.
			</p>

			<div style="text-align: center;">
				<a href="${appUrl}/dashboard" class="button">Entrar a mi cuenta</a>
			</div>

			<p style="margin-top: 20px;">
				Si ya no piensas usar la aplicación, no hace falta que hagas nada: este es
				un recordatorio ocasional, no una suscripción.
			</p>
		</div>

		<div class="footer">
			<p>
				¿Prefieres no recibir estos recordatorios?
				<a href="${bajaUrl}">Dar de baja los avisos</a>.
			</p>
			<p>Seguirás recibiendo los correos necesarios para tu cuenta, como la recuperación de contraseña.</p>
			<p>&copy; ${new Date().getFullYear()} Control de Gastos. Todos los derechos reservados.</p>
		</div>
	</div>
</body>
</html>
	`.trim();
}

/** Envía el recordatorio de inactividad. */
export async function sendRecordatorioEmail(
	email: string,
	nombre: string,
	dias: number,
	appUrl: string,
	bajaUrl: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
	try {
		if (!EMAIL_USER || !EMAIL_PASS) {
			console.error('❌ Configuración de email incompleta: no se envían recordatorios.');
			return { success: false, error: 'Configuración de email no disponible' };
		}

		const info = await getTransporter().sendMail({
			from: `"Control de Gastos" <${EMAIL_FROM || EMAIL_USER}>`,
			to: email,
			subject: `${nombre}, hace ${dias} días que no registras tus gastos`,
			html: getRecordatorioTemplate(nombre, dias, appUrl, bajaUrl),
			headers: {
				// Permite a Gmail y Outlook mostrar su propio botón de baja.
				// Sin esto, quien no quiera los correos usa el botón de spam, y eso
				// daña la reputación del remitente para TODOS los envíos, incluidos
				// los de recuperación de contraseña.
				'List-Unsubscribe': `<${bajaUrl}>`
			}
		});

		return { success: true, messageId: info.messageId };
	} catch (error) {
		// Sin el destinatario: en producción los logs persisten.
		console.error(
			'❌ Error al enviar recordatorio:',
			error instanceof Error ? error.message : error
		);
		return {
			success: false,
			error: (error instanceof Error ? error.message : '') || 'Error al enviar recordatorio'
		};
	}
}

/**
 * Plantilla para quien se registró y no llegó a crear nada.
 *
 * No puede decir «hace 80 días que no registras tus gastos», porque esa persona
 * nunca registró ninguno: sonaría a un correo automático mal configurado. El
 * mensaje reconoce que se quedó en la puerta y le señala el primer paso
 * concreto, que en esta aplicación es dar de alta una tarjeta o anotar un gasto.
 */
function getPrimerosPasosTemplate(
	nombreSinEscapar: string,
	appUrl: string,
	bajaUrl: string
): string {
	const nombre = escaparHtml(nombreSinEscapar);

	return `
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Empieza a usar Control de Gastos</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			line-height: 1.6;
			color: #333;
			max-width: 600px;
			margin: 0 auto;
			padding: 20px;
			background-color: #f5f5f5;
		}
		.container {
			background-color: #ffffff;
			border-radius: 8px;
			padding: 40px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		}
		.header { text-align: center; margin-bottom: 30px; }
		h1 { color: #1f2937; font-size: 24px; margin-bottom: 10px; }
		.content { margin-bottom: 30px; }
		.pasos {
			margin: 20px 0;
			padding: 20px;
			background-color: #f9fafb;
			border-radius: 6px;
			border: 1px solid #e5e7eb;
		}
		.pasos ol { margin: 0; padding-left: 20px; }
		.pasos li { margin-bottom: 8px; }
		.button {
			display: inline-block;
			padding: 12px 30px;
			background-color: #1f2937;
			color: #ffffff !important;
			text-decoration: none;
			border-radius: 6px;
			font-weight: 600;
			text-align: center;
			margin: 20px 0;
		}
		.footer {
			margin-top: 30px;
			padding-top: 20px;
			border-top: 1px solid #e5e7eb;
			text-align: center;
			color: #6b7280;
			font-size: 13px;
		}
		.footer a { color: #6b7280; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>¿Te ayudamos a empezar?</h1>
		</div>

		<div class="content">
			<p>Hola <strong>${nombre}</strong>,</p>
			<p>
				Creaste tu cuenta en <strong>Control de Gastos</strong> pero no llegaste a
				registrar nada. Si te quedaste con la duda de por dónde se empieza, son tres
				pasos:
			</p>

			<div class="pasos">
				<ol>
					<li>Da de alta una tarjeta, con su fecha de corte y su día de pago.</li>
					<li>Anota un gasto, aunque sea el del café de esta mañana.</li>
					<li>Mira la proyección: te dice cuánto te queda antes del próximo pago.</li>
				</ol>
			</div>

			<div style="text-align: center;">
				<a href="${appUrl}/dashboard" class="button">Empezar ahora</a>
			</div>

			<p style="margin-top: 20px;">
				Y si al final no era lo que buscabas, no pasa nada: te escribiremos como
				mucho una vez más y ahí lo dejamos.
			</p>
		</div>

		<div class="footer">
			<p>
				¿Prefieres no recibir estos correos?
				<a href="${bajaUrl}">Darte de baja</a>.
			</p>
			<p>Seguirás recibiendo los correos necesarios para tu cuenta, como la recuperación de contraseña.</p>
			<p>&copy; ${new Date().getFullYear()} Control de Gastos. Todos los derechos reservados.</p>
		</div>
	</div>
</body>
</html>
	`.trim();
}

/** Envía el correo de primeros pasos a quien nunca registró nada. */
export async function sendPrimerosPasosEmail(
	email: string,
	nombre: string,
	appUrl: string,
	bajaUrl: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
	try {
		if (!EMAIL_USER || !EMAIL_PASS) {
			console.error('❌ Configuración de email incompleta: no se envían recordatorios.');
			return { success: false, error: 'Configuración de email no disponible' };
		}

		const info = await getTransporter().sendMail({
			from: `"Control de Gastos" <${EMAIL_FROM || EMAIL_USER}>`,
			to: email,
			subject: `${nombre}, ¿te ayudamos a empezar en Control de Gastos?`,
			html: getPrimerosPasosTemplate(nombre, appUrl, bajaUrl),
			headers: { 'List-Unsubscribe': `<${bajaUrl}>` }
		});

		return { success: true, messageId: info.messageId };
	} catch (errorCrudo) {
		const error = detallesSmtp(errorCrudo);
		console.error(
			'❌ Error al enviar el correo de primeros pasos:',
			error instanceof Error ? error.message : error
		);
		return {
			success: false,
			error: (error instanceof Error ? error.message : '') || 'Error al enviar el correo'
		};
	}
}

/** Envía el correo de confirmación de dirección. */
export async function sendVerificacionEmail(
	email: string,
	nombre: string,
	enlace: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
	try {
		if (!EMAIL_USER || !EMAIL_PASS) {
			console.error('❌ Configuración de email incompleta: no se envía la verificación.');
			return { success: false, error: 'Configuración de email no disponible' };
		}

		const info = await getTransporter().sendMail({
			from: `"Control de Gastos" <${EMAIL_FROM || EMAIL_USER}>`,
			to: email,
			subject: 'Confirma tu correo · Control de Gastos',
			html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height:1.6; color:#333; max-width:600px; margin:0 auto; padding:20px; background-color:#f5f5f5;">
	<div style="background:#fff; border-radius:8px; padding:40px; box-shadow:0 2px 4px rgba(0,0,0,.1);">
		<h1 style="color:#1f2937; font-size:24px; text-align:center;">Confirma tu correo</h1>
		<p>Hola <strong>${escaparHtml(nombre)}</strong>,</p>
		<p>
			Confirma que esta dirección es tuya. Es lo que nos permitirá devolverte el acceso
			si alguna vez olvidas tu contraseña.
		</p>
		<div style="text-align:center;">
			<a href="${enlace}" style="display:inline-block; padding:12px 30px; background:#1f2937; color:#fff !important; text-decoration:none; border-radius:6px; font-weight:600; margin:20px 0;">
				Confirmar mi correo
			</a>
		</div>
		<p>O copia y pega este enlace en tu navegador:</p>
		<div style="color:#6b7280; font-size:14px; word-break:break-all; padding:15px; background:#f9fafb; border-radius:4px; border:1px solid #e5e7eb;">
			${enlace}
		</div>
		<p style="margin-top:20px;">
			El enlace caduca en 48 horas. Mientras tanto puedes usar la aplicación con normalidad.
		</p>
		<p style="color:#6b7280; font-size:13px; margin-top:30px; padding-top:20px; border-top:1px solid #e5e7eb;">
			Si no creaste ninguna cuenta en Control de Gastos, ignora este mensaje: sin
			confirmar, esa cuenta no podrá enviarte ningún otro correo.
		</p>
	</div>
</body>
</html>`.trim()
		});

		return { success: true, messageId: info.messageId };
	} catch (errorCrudo) {
		const error = detallesSmtp(errorCrudo);
		console.error(
			'❌ Error al enviar la verificación:',
			error instanceof Error ? error.message : error
		);
		return {
			success: false,
			error: (error instanceof Error ? error.message : '') || 'Error al enviar el correo'
		};
	}
}

// Función de prueba para verificar conexión SMTP
export async function testEmailConnection(): Promise<boolean> {
	try {
		console.log('=== Probando conexión SMTP ===');
		const transport = getTransporter();

		console.log('Verificando conexión...');
		await transport.verify();

		console.log('✓ Conexión SMTP exitosa');
		return true;
	} catch (errorCrudo) {
		const error = detallesSmtp(errorCrudo);
		console.error('❌ Error en conexión SMTP:', error.message);
		console.error('Código de error:', error.code);
		if (error.response) {
			console.error('Respuesta del servidor:', error.response);
		}
		return false;
	}
}
