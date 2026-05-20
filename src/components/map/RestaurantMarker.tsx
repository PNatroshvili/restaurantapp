import React from 'react';
import { Marker } from 'react-native-maps';
import { Restaurant } from '../../types';
import { ImageSource } from './markerImages';

interface Props {
  restaurant: Restaurant;
  isSelected: boolean;
  image: ImageSource | null;
  onPress: () => void;
}

export default function RestaurantMarker({ restaurant, isSelected, image, onPress }: Props) {
  if (!image) return null;
  return (
    <Marker
      coordinate={{
        latitude: Number(restaurant.latitude),
        longitude: Number(restaurant.longitude),
      }}
      image={image}
      anchor={{ x: 0.5, y: 0.75 }}
      zIndex={isSelected ? 999 : 100}
      tracksViewChanges={false}
      onPress={onPress}
    />
  );
}
