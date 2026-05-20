import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { COLORS } from '../../constants';
import { Restaurant } from '../../types';
import { DARK_MAP_STYLE } from './mapStyle';
import {
  ClusterIndex,
  MarkerItem,
  buildClusterIndex,
  getClusters,
  getClusterExpansionRegion,
} from './mapClustering';
import RestaurantMarker from './RestaurantMarker';
import ClusterMarker from './ClusterMarker';
import MarkerImageFactory, { CaptureItem } from './MarkerImageFactory';
import { ImageSource, clusterKey, restaurantKey } from './markerImages';

interface Props {
  restaurants: Restaurant[];
  selectedRestaurantId: string | null;
  onRestaurantPress: (restaurant: Restaurant) => void;
  initialRegion: Region;
  mapRef?: React.RefObject<MapView>;
  userLocation?: { lat: number; lng: number } | null;
  onRegionChangeComplete?: (region: Region) => void;
  onPress?: () => void;
}

export default function RestaurantMap({
  restaurants,
  selectedRestaurantId,
  onRestaurantPress,
  initialRegion,
  mapRef: externalRef,
  userLocation,
  onRegionChangeComplete: onRegionChangeProp,
  onPress,
}: Props) {
  const internalRef = useRef<MapView>(null);
  const mapRef = (externalRef ?? internalRef) as React.RefObject<MapView>;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [region, setRegion] = useState<Region>(initialRegion);
  const [imageCache, setImageCache] = useState<Map<string, ImageSource>>(new Map());

  const scIndex: ClusterIndex = useMemo(
    () => buildClusterIndex(restaurants),
    [restaurants],
  );

  const markers: MarkerItem[] = useMemo(
    () => getClusters(scIndex, region, selectedRestaurantId),
    [scIndex, region, selectedRestaurantId],
  );

  const routeCoords = useMemo(() => {
    if (!selectedRestaurantId || !userLocation) return null;
    const r = restaurants.find(x => x.id === selectedRestaurantId);
    if (!r) return null;
    return [
      { latitude: userLocation.lat, longitude: userLocation.lng },
      { latitude: Number(r.latitude), longitude: Number(r.longitude) },
    ];
  }, [selectedRestaurantId, userLocation, restaurants]);

  const handleRegionChangeComplete = useCallback((r: Region) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setRegion(r);
      onRegionChangeProp?.(r);
    }, 150);
  }, [onRegionChangeProp]);

  const handleClusterPress = useCallback(
    (clusterId: number, lat: number, lng: number) => {
      const newRegion = getClusterExpansionRegion(scIndex, clusterId, lat, lng);
      mapRef.current?.animateToRegion(newRegion, 350);
    },
    [scIndex],
  );

  const handleImageReady = useCallback((key: string, source: ImageSource) => {
    setImageCache(prev => {
      if (prev.has(key)) return prev;
      const next = new Map(prev);
      next.set(key, source);
      return next;
    });
  }, []);

  // Which images still need to be generated (deduped, not yet cached)
  const neededItems = useMemo<CaptureItem[]>(() => {
    const seen = new Set<string>();
    const items: CaptureItem[] = [];
    for (const item of markers) {
      if (item.isCluster) {
        const key = clusterKey(item.count);
        if (!imageCache.has(key) && !seen.has(key)) {
          seen.add(key);
          items.push({ key, type: 'cluster', count: item.count });
        }
      } else {
        const rating = Number(item.restaurant.ratingAvg);
        const label = rating > 0 ? rating.toFixed(1) : '–';
        for (const selected of [false, true] as const) {
          const key = restaurantKey(label, selected);
          if (!imageCache.has(key) && !seen.has(key)) {
            seen.add(key);
            items.push({ key, type: 'restaurant', label, selected });
          }
        }
      }
    }
    return items;
  }, [markers, imageCache]);

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/*
        Hidden SVG factory lives OUTSIDE <MapView>.
        SVGs are rendered at opacity 0 so Android captures them correctly,
        then their PNG data URIs are passed to <Marker image={...}> — no
        custom children inside Marker at all.
      */}
      <MarkerImageFactory items={neededItems} onReady={handleImageReady} />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsBuildings={false}
        showsTraffic={false}
        onPress={onPress}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {routeCoords && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={COLORS.primary + 'AA'}
            strokeWidth={2}
            lineDashPattern={[8, 6]}
          />
        )}

        {markers.map(item => {
          if (item.isCluster) {
            const img = imageCache.get(clusterKey(item.count)) ?? null;
            return (
              <ClusterMarker
                key={item.id}
                coordinate={{ latitude: item.lat, longitude: item.lng }}
                count={item.count}
                image={img}
                onPress={() => handleClusterPress(item.clusterId, item.lat, item.lng)}
              />
            );
          }
          const rating = Number(item.restaurant.ratingAvg);
          const label = rating > 0 ? rating.toFixed(1) : '–';
          const img = imageCache.get(restaurantKey(label, item.isSelected)) ?? null;
          return (
            <RestaurantMarker
              key={item.id}
              restaurant={item.restaurant}
              isSelected={item.isSelected}
              image={img}
              onPress={() => onRestaurantPress(item.restaurant)}
            />
          );
        })}
      </MapView>
    </View>
  );
}
