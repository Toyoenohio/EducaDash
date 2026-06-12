CREATE OR REPLACE FUNCTION public.get_login_email(identifier text)
RETURNS text
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- 1. Intentar buscar por cédula en la tabla alumnos, 
  -- y luego traer el email real de auth.users
  SELECT u.email INTO v_email
  FROM auth.users u
  JOIN public.alumnos a ON a.id = u.id
  WHERE a.cedula = identifier
  LIMIT 1;

  IF v_email IS NOT NULL THEN
    RETURN v_email;
  END IF;

  -- 2. Si no encuentra por cédula, asume que lo que escribió es directamente el email
  RETURN identifier;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_login_email(text) TO anon, authenticated;
