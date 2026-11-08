# Guía: guardar los datos de Gestión Pro Total en Supabase (nube gratuita)

Esta guía es para la versión **sin Base44**. Con Supabase, los datos y las fotos se guardan en tu propio proyecto en la nube y se comparten entre el ordenador, el móvil y la tablet. El archivo `supabase/esquema.sql` va en la misma carpeta que esta guía.

## 1. Crear la cuenta gratuita
1. Entra en **supabase.com** y pulsa **Start your project**.
2. Regístrate con tu cuenta de GitHub o con tu correo.
3. Crea una organización con el plan **Free**. No pide tarjeta.

## 2. Crear el proyecto
1. Pulsa **New project**.
2. Ponle un nombre, por ejemplo `gestion-pro-total`.
3. Elige una contraseña de base de datos y guárdala (el programa no la usa).
4. Elige la región **West EU (Ireland)** o la más cercana.
5. Plan **Free** y pulsa **Create new project**. Tarda un par de minutos.

## 3. Crear las tablas y la carpeta de archivos
1. Menú izquierdo → **SQL Editor** → **New query**.
2. Abre `supabase/esquema.sql`, copia todo su contenido y pégalo.
3. Pulsa **Run**. Debe decir «Success».
4. Se crean la tabla `registros` y la carpeta pública `archivos` (fotos, firmas, planos).

## 4. Copiar la dirección y la clave
1. **Project Settings → API** (puede llamarse «Data API» o «API Keys»).
2. Copia la **Project URL**: `https://xxxx.supabase.co`.
3. Copia la clave **anon public** (si solo ves «Publishable key», es la equivalente).
4. **Nunca** copies la clave `service_role`.

## 5. Conectar el programa
1. Al abrir el programa por primera vez elige **Supabase (nube)**. Si ya lo usabas: **Configuración de empresa → Dónde se guardan los datos → Cambiar**.
2. Pega la URL y la clave anon.
3. Pulsa **Probar y guardar**.

Si falla, el programa lo explica:
- «Falta crear la tabla registros»: no se hizo el paso 3.
- «La clave anon no es válida»: se pegó otra clave.
- «No se alcanza Supabase»: la URL está mal escrita.

## 6. Crear los usuarios del equipo
1. En Supabase: **Authentication → Users → Add user**.
2. Escribe el correo y la clave y marca **Auto Confirm User**.
3. Entra en el programa con esos datos. Repite para cada persona.
4. Cuando estén todos, ve a **Authentication → Providers → Email** y desactiva **Allow new users to sign up**, para que nadie más pueda crearse una cuenta.

## 7. Pasar los datos que ya tienes
Los datos no se mueven solos.
1. En el sitio de origen: **Copia de seguridad → Exportar**, y guarda el archivo.
2. Cambia el destino a Supabase (paso 5).
3. **Copia de seguridad → Restaurar**, elige el archivo y espera al 100 %.

## 8. Límites del plan gratuito
- Base de datos: 500 MB. Archivos: 1 GB.
- Si pasa una semana sin usarse, el proyecto se pausa; se reactiva con un clic desde el panel de Supabase.
- Para muchas fotos o planos pesados puede quedarse corto. Las opciones son el plan de pago de Supabase (desde unos 25 $/mes) o el servidor propio en casa (`GUIA-SERVIDOR-PROPIO.md`), que no tiene límites.

## 9. Seguridad
- La clave anon es pública por diseño; la protección está en que solo entran los usuarios que has creado.
- Guarda la contraseña de la base de datos y no compartas nunca la clave `service_role`.
- Haz copias de seguridad periódicas desde el programa.
