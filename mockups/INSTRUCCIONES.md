# Instrucciones para subir Mockups

## 📁 Estructura de carpetas:

- `images/advisor/` → Imágenes del perfil Asesor
- `images/admin/` → Imágenes del perfil Admin

## 📝 Para agregar una nueva imagen:

1. Guarda la imagen en la carpeta correspondiente
2. Abre el archivo JSON correspondiente (`data/advisor-mockups.json` o `data/admin-mockups.json`)
3. Agrega una nueva entrada en el arreglo `"mockups"`:

```json
{
  "imagen": "images/advisor/nombre-de-la-imagen.png",
  "titulo": "Título de la pantalla",
  "descripcion": "Descripción detallada de lo que se ve en la imagen",
  "tarea": "Categoría de la tarea (ej: Autenticación, Navegación, etc)"
}