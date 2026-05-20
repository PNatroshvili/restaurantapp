import React from 'react';
import { Marker } from 'react-native-maps';
import { ImageSource } from './markerImages';

interface Props {
  coordinate: { latitude: number; longitude: number };
  count: number;
  image: ImageSource | null;
  onPress: () => void;
}

export default function ClusterMarker({ coordinate, image, onPress }: Props) {
  if (!image) return null;
  return (
    <Marker
      coordinate={coordinate}
      image={image}
      anchor={{ x: 0.5, y: 0.75 }}
      zIndex={500}
      tracksViewChanges={false}
      onPress={onPress}
    />
  );
}
