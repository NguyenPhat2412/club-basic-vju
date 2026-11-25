-- V45: Remove stale cached i18n entries containing internal (PB-XX) tags or Telegram references
DELETE FROM i18n_translations
WHERE source_text ~* '(\(|（)PB-\d+(\)|）)'
   OR translated_text ~* '(\(|（)PB-\d+(\)|）)'
   OR source_text ~* '\ytelegram\y'
   OR translated_text ~* '\ytelegram\y';
