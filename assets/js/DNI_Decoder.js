// Configura las credenciales de AWS
AWS.config.update({
  region: 'us-east-1',
  credentials: new AWS.Credentials({
    accessKeyId:'', //Sustituir por el recurrente,
    secretAccessKey:'' ,//Sustituir,
    sessionToken:''//Sustituir
  })
});

const s3 = new AWS.S3({ params: { Bucket: 'marva04-bucket' } });
const rekognition = new AWS.Rekognition();

// Función para procesar todas las imágenes de DNIs
function processAll() {
  const fileInput = document.getElementById('file-upload');
  const files = fileInput.files;

  if (!files.length) {
    return alert("Por favor, selecciona archivos de imagen.");
  }

  // Limpiar los resultados anteriores
  document.getElementById('results').innerText = "Procesando...";

  // Procesar cada archivo
  Array.from(files).forEach((file, index) => {
    convertToJPEG(file, index);
  });
}

// Función para convertir una imagen a JPEG
function convertToJPEG(file, index) {
  const reader = new FileReader();
  
  reader.onload = function (e) {
    const img = new Image();
    img.src = e.target.result;

    img.onload = function () {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Convertir la imagen a JPEG
      const jpegDataUrl = canvas.toDataURL('image/jpeg');
      const jpegBlob = dataURLtoBlob(jpegDataUrl);
      
      // Llamar a la función para subir la imagen convertida
      uploadImage(jpegBlob, file.name, index);
    };
  };
  reader.readAsDataURL(file);
}

// Función para convertir data URL a Blob
function dataURLtoBlob(dataUrl) {
  const arr = dataUrl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length, // Cambiar 'const' a 'let'
        u8arr = new Uint8Array(n);

  let i = 0; // Usamos 'let' para poder modificar 'n' durante el ciclo
  while(i < n){
    u8arr[i] = bstr.charCodeAt(i);
    i++;
  }

  return new Blob([u8arr], { type: mime });
}

// Función para subir una imagen a S3
function uploadImage(file, fileName, index) {
  const params = {
    Key: fileName,
    Body: file,
    ContentType: 'image/jpeg',
    ACL: 'public-read'
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error('Error al subir:', err);
      document.getElementById('results').innerText += `❌ Error al subir la imagen ${fileName}.\n`;
    } else {
      // Crear un contenedor para la imagen y su JSON
      const resultContainer = document.createElement('div');
      resultContainer.className = "result-entry mb-4 p-3 bg-light border rounded";

      // Imagen preview
      const imgElement = document.createElement('img');
      imgElement.src = data.Location;
      imgElement.alt = fileName;
      imgElement.className = "img-thumbnail mb-2";
      imgElement.style.maxWidth = "300px";

      // Crear contenedor para el texto JSON
      const jsonElement = document.createElement('pre');
      jsonElement.innerText = "Procesando...";
      jsonElement.className = "bg-dark text-white p-2 rounded";

      // Agrega los elementos de imagen y JSON al contenedor
      resultContainer.appendChild(imgElement);
      resultContainer.appendChild(jsonElement);
      
      // Añadir el contenedor al DOM sin reemplazar todo
      document.getElementById('results').appendChild(resultContainer);

      // Procesar la imagen para extraer texto
      analyzeImage(fileName, jsonElement);
    }
  });
}



function extractData(texto) {
  let datos = {
    primer_apellido: null,
    segundo_apellido: null,
    nombre: null,
    sexo: null,
    nacionalidad: null,
    fecha_nacimiento: null,
    dni: null,
    valido_hasta: null
  };

  const lines = texto.split("\n").map(line => line.trim().toUpperCase());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 🧩 Apellidos
    if (line.includes("APELLIDO") && i + 2 < lines.length) {
      datos.primer_apellido = lines[i + 1];
      datos.segundo_apellido = lines[i + 2];
      i += 2;
    }

    // 🧩 Nombre (permitimos OCR mal leído: NOMARE, NOMBR, etc.)
    if (line.match(/^NOM\w*/i) && i + 1 < lines.length) {
      datos.nombre = lines[i + 1];
      i += 1;
    }

    // 🧩 Sexo y nacionalidad (buscar valores esperados)
    if (["M", "F"].includes(lines[i]) && i + 1 < lines.length && lines[i + 1].length === 3) {
      datos.sexo = lines[i];
      datos.nacionalidad = lines[i + 1];
      i += 1;
    }

    // 🧩 Fecha nacimiento (después de nacionalidad, formato dd mm aaaa)
    if (line.match(/^\d{2} \d{2} \d{4}$/) && !datos.fecha_nacimiento) {
      datos.fecha_nacimiento = line;
    }

    // 🧩 Validez: buscar dos fechas en una misma línea
    if (line.match(/^\d{2} \d{2} \d{4} \d{2} \d{2} \d{4}$/)) {
      const fechas = line.match(/\d{2} \d{2} \d{4}/g);
      if (fechas && fechas.length === 2) {
        datos.valido_hasta = fechas[1];
      }
    }

    // 🧩 DNI: buscar patrón 8 números + letra
    if (line.match(/\b\d{8}[A-Z]\b/)) {
      datos.dni = line.match(/\b\d{8}[A-Z]\b/)[0];
    }
  }

  return datos;
}



// Función para extraer valores de una línea de texto
function extractValue(line) {
  let parts = line.split(":");
  if (parts.length > 1) {
    return parts[1].trim();
  }
  return line.trim();
}
let dniResults = [];

function analyzeImage(imageName, jsonElement) {
  const params = {
    Image: {
      S3Object: {
        Bucket: 'marva04-bucket',
        Name: imageName
      }
    }
  };

  rekognition.detectText(params, (err, data) => {
    if (err) {
      console.error('Error al analizar la imagen:', err);
      jsonElement.innerText = `❌ Error al analizar la imagen: ${err.message}`;
    } else {
      const detectedText = data.TextDetections
        .filter(item => item.Type === "LINE")
        .map(item => item.DetectedText)
        .join("\n");

      const datosExtraidos = extractData(detectedText);

      // Agregar los resultados al array dniResults
      dniResults.push({
        file: imageName,
        datos: datosExtraidos
      });

      // Actualizamos la vista previa del JSON
      jsonElement.innerText = JSON.stringify(datosExtraidos, null, 2);
    }

    // ✅ Si ya hemos procesado todas las imágenes, mostramos el JSON completo
    if (dniResults.length === document.getElementById('file-upload').files.length) {
      mostrarResultadosFinales();
    }
  });
}



function mostrarResultadosFinales() {
  const resultsDiv = document.getElementById('results');
  const finalResults = document.createElement('div');
  finalResults.className = 'mt-4 bg-light p-3 rounded shadow-sm';
}


function descargarJSON() {
  // Verificamos si los resultados ya están disponibles
  if (dniResults.length === 0) {
    alert("No hay resultados para descargar.");
    return;
  }

  // Creamos el Blob con los resultados en formato JSON
  const blob = new Blob([JSON.stringify(dniResults, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Creamos un enlace de descarga y lo activamos
  const a = document.createElement('a');
  a.href = url;
  a.download = 'resultados_dni.json';  // Nombre del archivo de descarga
  a.click();  // Dispara la descarga

  // Limpiar el objeto URL para liberar memoria
  URL.revokeObjectURL(url);
}