-- Reset cirurgico: comercial01 para teste
UPDATE auth.users
SET encrypted_password = crypt('@Promobrindes2021', gen_salt('bf')), updated_at = now()
WHERE email = 'comercial01@promobrindes.com.br';
