// En iOS/Android, provee un `localStorage` global respaldado por SQLite para
// que la sesión de Supabase persista. En web ya existe (ver .web.ts).
import 'expo-sqlite/localStorage/install';
