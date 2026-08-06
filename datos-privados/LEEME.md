# Datos privados

Aquí van los archivos con datos reales de la escuela: los Excel de Manuela, la
hoja de asistencias, la Ficha con los datos personales de los alumnos.

**Nada de lo que esté en esta carpeta se sube a GitHub.** Está excluida en el
`.gitignore`, junto con cualquier `.xlsx`, `.xls` o `.csv` del proyecto.

## Por qué existe

El repositorio es privado, pero eso no lo convierte en un sitio para guardar
datos. Quien tiene acceso al código no tiene por qué tener acceso a los datos:
Javier colabora en la programación y, por decisión de la escuela, no debe ver
finanzas ni cuotas. Si los Excel viven en el repositorio, esa separación deja
de existir.

Además, lo que entra en el historial de Git es muy difícil de sacar después:
borrar el archivo en un commit posterior no lo elimina de la historia.

## Qué poner aquí

- `ingresos-egresos-<mes>.xlsx` — los cierres de Manuela
- `asistencia-<año>.xlsx` — la hoja de control de asistencia
- Cualquier exportación con nombres, cédulas, teléfonos o montos

## Qué NO poner aquí

Nada que deba versionarse: código, migraciones, documentación. Esta carpeta no
tiene historial, así que si borras un archivo, no hay forma de recuperarlo.
Conserva siempre el original en su sitio (Drive, el correo, la PC de Manuela).
