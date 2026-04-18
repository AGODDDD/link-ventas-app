import crypto from 'crypto';

// Algoritmo GCM para cifrado autenticado, mucho más seguro que CBC
const ALGORITHM = 'aes-256-gcm';

/**
 * Encripta un texto usando AES-256-GCM y devuelve un formato seguro: 
 * IV (hex) : Auth_Tag (hex) : Encrypted_Data (hex)
 */
export function encryptText(text: string): string {
    if (!text) return '';
    
    // Obtenemos e instanciamos la llave
    const keyString = process.env.PAYMENT_ENCRYPTION_KEY;
    if (!keyString) throw new Error('Missing PAYMENT_ENCRYPTION_KEY in .env.local');

    const key = Buffer.from(keyString, 'hex'); // Debe ser string hex de 64 caracteres (32 bytes)
    
    if (key.length !== 32) {
        throw new Error('PAYMENT_ENCRYPTION_KEY string length validation failed. Must be 32 bytes hex.');
    }

    const iv = crypto.randomBytes(16); // Vector de inicialización único para cada encriptación
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');

    // Retorna IV : AUTH_TAG : ENCRYPTED_PAYLOAD
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Desencripta un string cifrado por la función `encryptText`.
 */
export function decryptText(encryptedPayload: string): string {
    if (!encryptedPayload) return '';
    
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
        // En caso de que haya una llave plana sucia de pruebas previas (Graceful degrade/Warning)
        console.warn('Attempted to decrypt invalid format payload. Returning raw text as fallback for backwards compatibility.');
        return encryptedPayload;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    
    const keyString = process.env.PAYMENT_ENCRYPTION_KEY;
    if (!keyString) throw new Error('Missing PAYMENT_ENCRYPTION_KEY in .env.local');
    
    const key = Buffer.from(keyString, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    try {
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error('Decryption failed, returning empty string or throw error', e);
        throw new Error('Server Failed to Decrypt Secrets. Key Tampered or Environment Changed.');
    }
}
