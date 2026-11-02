const fs = require('fs');
const path = require('path');

// lucide-react-native exporta ~1.500 íconos desde un solo archivo y Metro no
// descarta los que no se usan: la app web cargaba ~1,7 MB de íconos. Esta regla
// convierte `import { Truck } from 'lucide-react-native'` en
// `import Truck from 'lucide-react-native/icons/truck'`, así solo entran los
// que se usan. La tabla nombre → archivo sale del índice de la propia librería
// (incluye los alias, p. ej. Trash2 → trash).
function tablaLucide() {
  const indice = path.join(__dirname, 'node_modules/lucide-react-native/dist/esm/lucide-react-native.mjs');
  const tabla = new Map();
  if (!fs.existsSync(indice)) return tabla;
  const re = /export \{([^}]*)\} from '\.\/icons\/([\w-]+)\.mjs';/g;
  const texto = fs.readFileSync(indice, 'utf8');
  for (let m = re.exec(texto); m; m = re.exec(texto)) {
    for (const parte of m[1].split(',')) {
      const nombre = parte.trim().replace(/^default as /, '');
      if (nombre) tabla.set(nombre, m[2]);
    }
  }
  return tabla;
}

function lucidePorIcono({ types: t }) {
  const tabla = tablaLucide();
  return {
    name: 'lucide-por-icono',
    visitor: {
      ImportDeclaration(ruta) {
        const nodo = ruta.node;
        if (nodo.source.value !== 'lucide-react-native' || nodo.importKind === 'type') return;
        const especificadores = nodo.specifiers;
        // Solo `import { A, B as C }` de íconos conocidos; cualquier otro caso queda igual.
        const todosIconos = especificadores.every(
          (e) => t.isImportSpecifier(e) && e.importKind !== 'type' && tabla.has(e.imported.name)
        );
        if (!especificadores.length || !todosIconos) return;
        ruta.replaceWithMultiple(
          especificadores.map((e) =>
            t.importDeclaration(
              [t.importDefaultSpecifier(t.identifier(e.local.name))],
              t.stringLiteral(`lucide-react-native/icons/${tabla.get(e.imported.name)}`)
            )
          )
        );
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [lucidePorIcono],
  };
};
