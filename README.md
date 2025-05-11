# 🪪 Conversor DNI a JSON con AWS Rekognition

Este proyecto permite subir imágenes de DNI, procesarlas con Amazon Rekognition para extraer los datos relevantes (nombre, apellidos, fecha de nacimiento, validez, etc.) y exportarlos en formato JSON. Todo el procesamiento se realiza directamente desde el navegador y los servicios de AWS.

## 📦 Requisitos

- Cuenta en AWS con acceso a:
  - S3
  - Rekognition
- Un bucket S3 creado (ej: `marva04-bucket`)
- Token temporal de AWS (puedes generarlo con IAM o usar Cognito/Federated Identities para automatizar)

## 🚀 Despliegue local

1. **Clona el repositorio:**

   ```bash
   git clone https://github.com/tu-usuario/dni-json-app.git
   cd dni-json-app
   ```

2. **Estructura de archivos esperada:**

   ```
   .
   ├── index.html
   ├── assets/
   │   └── js/
   │       └── DNI_Decoder.js
   ├── bootstrap/
   │   └── bootstrap.css
   ├── css/
   │   └── style.css
   ├── blocks.css
   └── README.md
   ```

3. **Edita las credenciales temporales:**

   En el archivo `DNI_Decoder.js`, localiza la sección de configuración de AWS:

   ```js
   AWS.config.update({
     region: 'us-east-1',
     credentials: new AWS.Credentials({
       accessKeyId: 'AQUÍ_TU_ACCESS_KEY',
       secretAccessKey: 'AQUÍ_TU_SECRET_KEY',
       sessionToken: 'AQUÍ_TU_SESSION_TOKEN'
     })
   });
   ```

   ⚠️ Estas credenciales deben renovarse cada 4 horas si usas tokens temporales (STS).

4. **Abre `index.html` en un navegador compatible (recomendado Chrome/Edge).**

   Ya puedes subir imágenes y descargar los datos en formato JSON.

## 🧠 Servicios AWS utilizados

- **Amazon Rekognition:** para OCR y detección de texto en imágenes.
- **Amazon S3:** para almacenar temporalmente las imágenes.
- **(Opcional en futuro)** AWS Lambda, API Gateway y DynamoDB para hacer el sistema persistente y escalable.

## 🔐 Seguridad

- Este proyecto utiliza tokens temporales de AWS (STS), por lo que no guarda claves persistentes.
- Si necesitas despliegue en producción, se recomienda usar Cognito + API Gateway para obtener tokens automáticamente.

## 📄 Licencia

MIT - Proyecto académico desarrollado por Alex Escriva y Marcos Martínez para una entrega universitaria.
