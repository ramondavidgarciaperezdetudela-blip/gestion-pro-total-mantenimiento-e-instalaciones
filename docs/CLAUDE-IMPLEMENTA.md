# Que Claude programe las peticiones del Centro de IA

Una aplicación ya instalada no puede reescribir su propio código. El camino real para que la IA cambie el programa es este:

1. En el Centro de IA, pestaña **Conectores**, crea un conector **GitHub** con el repositorio (`usuario/repositorio`) y su token (permiso *Issues*). El token queda solo en el aparato.
2. Pídele a la IA el cambio. Si exige tocar el código, se guarda en **Peticiones**.
3. Pulsa **Que Claude la implemente**: se crea una incidencia con la etiqueta `claude`.
4. El flujo `.github/workflows/claude-implementa.yml` (Claude Code en GitHub) programa el cambio y abre una *pull request*.
5. Revisa y fusiona la pull request; las compilaciones de Windows, Linux y Android generan la versión nueva.

## Configuración (una sola vez)
- En GitHub: *Settings → Secrets and variables → Actions → New repository secret* con nombre `ANTHROPIC_API_KEY` y tu clave de Anthropic.
- Instala la app **Claude** de GitHub en el repositorio: https://github.com/apps/claude
- En *Settings → Actions → General → Workflow permissions* marca «Read and write» y permite crear pull requests.

Cada ejecución gasta saldo de tu cuenta de Anthropic.
