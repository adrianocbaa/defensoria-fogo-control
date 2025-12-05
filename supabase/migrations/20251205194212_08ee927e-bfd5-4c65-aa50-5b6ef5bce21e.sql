-- Correção de valores de aditivo_items para obra Guiratinga
-- Abrir sessão temporariamente, atualizar valores, e rebloquear

-- Desbloquear a sessão
UPDATE aditivo_sessions SET status = 'aberta' WHERE id = '9e4b1745-d849-4dc5-b526-1e2d20959fb9';

-- Atualizar valores corrigidos
UPDATE aditivo_items SET total = 11346.94 WHERE id = '7b138b61-a716-406d-8568-0d623277908b';
UPDATE aditivo_items SET total = 39.49 WHERE id = '4726985c-d54e-4e06-bf77-1974f688dba2';
UPDATE aditivo_items SET total = 37.44 WHERE id = '1e9f5eae-66ae-4d4f-8371-526eb0b6c20c';
UPDATE aditivo_items SET total = 673.53 WHERE id = '69ef4608-2048-472f-bee5-f4243c8c7113';
UPDATE aditivo_items SET total = 511.70 WHERE id = 'fd8cd517-b94b-412a-8498-f454a117e9a0';
UPDATE aditivo_items SET total = 754.25 WHERE id = '30e60dde-2171-4f29-a703-2df1fd55bb88';

-- Rebloquear a sessão
UPDATE aditivo_sessions SET status = 'bloqueada' WHERE id = '9e4b1745-d849-4dc5-b526-1e2d20959fb9';