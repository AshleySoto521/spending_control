/**
 * Manejo de errores atrapados en las páginas.
 *
 * En un `catch`, TypeScript entrega el error como `unknown` porque en
 * JavaScript se puede lanzar cualquier cosa, no solo un `Error`. Estas dos
 * funciones concentran la comprobación para que las páginas no tengan que
 * repetirla ni recurrir a `any`.
 */

/** Texto que se le puede enseñar a una persona. */
export function mensajeDeError(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;

	return 'Ocurrió un error inesperado';
}

/**
 * ¿El error ya lo gestionó `apiClient`?
 *
 * Ante un 401 o un 403, `apiClient` muestra el modal de sesión expirada y
 * relanza. Las páginas no deben volver a presentarlo como un fallo propio: la
 * persona vería un mensaje de error rojo debajo del modal que ya le está
 * diciendo qué pasó.
 */
export function esSesionExpirada(error: unknown): boolean {
	return mensajeDeError(error).includes('Sesión expirada');
}
