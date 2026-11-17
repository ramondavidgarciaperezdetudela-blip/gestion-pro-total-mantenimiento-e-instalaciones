# Quitar el aviso de Windows (SmartScreen / Defender) al instalar

## Por qué sale
Cuando descargas un programa sin **firma digital**, Windows enseña la pantalla azul «Windows protegió su PC» y hay que pulsar *Más información → Ejecutar de todas formas*. No es un virus: Windows desconfía de cualquier instalador que no sabe quién lo ha hecho.

**No hay truco de programación que lo quite.** La única solución real, y la que usa todo el software que se vende, es **firmar los instaladores con un certificado a tu nombre**. Yo no puedo crearlo por ti: requiere validar tu identidad (o la de tu empresa) con Microsoft o con una autoridad de certificación.

## Opciones (Microsoft, 2026)
| Opción | Coste | Notas |
|---|---|---|
| **Azure Artifact Signing** (antes Trusted Signing) | unos 10 $/mes | Sin token físico, funciona desde GitHub. Empresas en EE. UU., Canadá, UE y Reino Unido; **autónomos/personas solo en EE. UU. y Canadá**. Validación de identidad: unos días. |
| **Certificado OV** (Sectigo, DigiCert, SSL.com…) | 150–300 €/año | Vale en cualquier país. La clave va en un token o en la nube de la autoridad. |
| Microsoft Store | gratis | Windows firma por ti y no sale ningún aviso, pero hay que publicar la app en la Store. |
| EV | 400 $+/año | Desde 2024 ya no salta SmartScreen antes que el OV; no compensa. |

**Importante:** con cualquier firma (OV o Azure) los primeros días Windows puede seguir avisando hasta que el programa gana «reputación». Firmando todas las versiones con el **mismo editor**, la reputación se acumula y el aviso desaparece. Sin firma no desaparece nunca.

## Cómo se activa en este proyecto
El workflow `build-desktop.yml` ya está preparado: **firma solo cuando existen los secretos**. Sin ellos funciona como hasta ahora.

En GitHub → repositorio → *Settings → Secrets and variables → Actions → New repository secret*:

**A) Azure Artifact Signing**
`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` (una «app registration» con el rol *Artifact Signing Certificate Profile Signer*), `AZ_FIRMA_ENDPOINT` (p. ej. `https://weu.codesigning.azure.net`), `AZ_FIRMA_CUENTA` (nombre de la cuenta), `AZ_FIRMA_PERFIL` (perfil de certificado) y `AZ_FIRMA_EDITOR` (el nombre exacto de tu identidad validada).

**B) Certificado .pfx exportable**
`WIN_CSC_LINK` (el .pfx convertido a base64) y `WIN_CSC_KEY_PASSWORD` (su contraseña). Ojo: desde 2023 muchas autoridades ya no entregan el .pfx y firman desde su nube; en ese caso usa su método de firma remota o la opción A.

Después lanza el workflow *Build Desktop Installers* y el `.exe` de Windows saldrá firmado (clic derecho → Propiedades → *Firmas digitales*).

## Mientras tanto (sin firma)
- Descarga el **Instalador** (no el Portable: los .exe portables se marcan más).
- Pantalla azul → **Más información → Ejecutar de todas formas** (una vez por versión).
- Si Defender lo pone en cuarentena, pulsa *Permitir en el dispositivo* en Seguridad de Windows → Protección antivirus → Historial de protección.
- Puedes enviar el instalador a https://www.microsoft.com/wdsi/filesubmission («No es malware») para que Microsoft lo valore; ayuda, pero no sustituye a la firma.

## Para vender el programa
Firmar es imprescindible: sin firma, muchas empresas y antivirus bloquean la instalación y el cliente desconfía. Mi recomendación: Azure Artifact Signing si tienes empresa en la UE; si eres autónomo en España, un certificado OV con firma en la nube.
