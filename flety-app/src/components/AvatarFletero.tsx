import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { iniciales } from '@/lib/empresa';
import { urlFotoPerfil } from '@/lib/perfilChofer';
import { colors } from '@/theme';

// Foto de perfil del fletero (si la subió) o sus iniciales.
export function AvatarFletero({
  nombre,
  foto,
  tam,
  style,
  textStyle,
  children,
}: {
  nombre: string;
  foto?: string | null;
  tam: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}) {
  const url = urlFotoPerfil(foto);
  const [fallo, setFallo] = useState<string | null>(null);
  const conFoto = !!url && fallo !== url;
  return (
    <View
      style={[
        { width: tam, height: tam, borderRadius: tam / 2, alignItems: 'center', justifyContent: 'center' },
        { backgroundColor: colors.accent },
        style,
      ]}>
      {conFoto ? (
        <Image
          source={{ uri: url }}
          style={{ position: 'absolute', top: 0, left: 0, width: tam, height: tam, borderRadius: tam / 2 }}
          contentFit="cover"
          transition={150}
          onError={() => setFallo(url)}
          accessibilityLabel={`Foto de ${nombre}`}
        />
      ) : (
        <Text style={textStyle}>{iniciales(nombre)}</Text>
      )}
      {children}
    </View>
  );
}
