import Supercluster from 'supercluster';
import { Region } from 'react-native-maps';
import { Restaurant } from '../../types';

export type ClusterIndex = Supercluster<{ restaurant: Restaurant }>;

export type MarkerItem =
  | {
      id: string;
      lat: number;
      lng: number;
      isCluster: true;
      count: number;
      clusterId: number;
    }
  | {
      id: string;
      lat: number;
      lng: number;
      isCluster: false;
      restaurant: Restaurant;
      rating: number;
      isSelected: boolean;
    };

export function buildClusterIndex(restaurants: Restaurant[]): ClusterIndex {
  const index = new Supercluster<{ restaurant: Restaurant }>({
    radius: 120,
    extent: 512,
    maxZoom: 17,
    minPoints: 3,
  });
  index.load(
    restaurants
      .filter(r => r.latitude && r.longitude)
      .map(r => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [Number(r.longitude), Number(r.latitude)],
        },
        properties: { restaurant: r },
      })),
  );
  return index;
}

export function regionToZoom(latitudeDelta: number): number {
  return Math.round(Math.log2(360 / latitudeDelta));
}

export function regionToBBox(region: Region): [number, number, number, number] {
  return [
    region.longitude - region.longitudeDelta / 2,
    region.latitude - region.latitudeDelta / 2,
    region.longitude + region.longitudeDelta / 2,
    region.latitude + region.latitudeDelta / 2,
  ];
}

export function getClusters(
  index: ClusterIndex,
  region: Region,
  selectedRestaurantId: string | null,
): MarkerItem[] {
  const zoom = regionToZoom(region.latitudeDelta);
  const features = index.getClusters(regionToBBox(region), zoom);

  return features.map(feature => {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties as any;

    if (props.cluster === true) {
      return {
        id: `cluster-${props.cluster_id}`,
        lat,
        lng,
        isCluster: true as const,
        count: props.point_count,
        clusterId: props.cluster_id,
      };
    }

    const r = props.restaurant as Restaurant;
    return {
      id: r.id,
      lat,
      lng,
      isCluster: false as const,
      restaurant: r,
      rating: Number(r.ratingAvg),
      isSelected: r.id === selectedRestaurantId,
    };
  });
}

export function getClusterExpansionRegion(
  index: ClusterIndex,
  clusterId: number,
  lat: number,
  lng: number,
): Region {
  const zoom = Math.min(index.getClusterExpansionZoom(clusterId), 18);
  const delta = 360 / Math.pow(2, zoom);
  return { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta };
}
