import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function LukmaLogo({ size = 38, showWord = true }: { size?: number; showWord?: boolean }) {
  return (
    <View style={styles.row}>
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Path fill="#D35839" d="M256 34c-108 0-188 80-188 184 0 94 64 164 188 260 124-96 188-166 188-260C444 114 364 34 256 34Z"/>
        <Path fill="#fff" d="M203 102c-10 0-18 8-18 18v79c0 26 12 49 32 64l13 10v103c0 14 11 25 25 25s25-11 25-25V273l13-10c20-15 32-38 32-64v-79c0-10-8-18-18-18s-18 8-18 18v68h-22v-68c0-10-8-18-18-18s-18 8-18 18v68h-22v-68c0-10-8-18-18-18Zm53 198c-8 0-15-6-15-14v-62l-15-12c-12-9-19-23-19-39v-10h98v10c0 16-7 30-19 39l-15 12v62c0 8-7 14-15 14Z"/>
      </Svg>
      {showWord ? <Text style={styles.word}>LUKMA</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { color: '#17201B', fontSize: 20, fontWeight: '900', letterSpacing: -0.7 },
});
