# Idee e funzionalità future

## Flag disabilita email
- Aggiungere campo `emailEnabled` (booleano) nella tabella `Setting`
- Checkbox nelle impostazioni admin
- Controllo `if (settings.emailEnabled)` prima di ogni `sendMail`
- Utile in fase di test per non inviare email reali
