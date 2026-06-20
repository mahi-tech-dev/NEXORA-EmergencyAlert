import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";

const { width, height } = Dimensions.get("window");

interface Props {
  onFinished: () => void;
}

export default function SplashAnimation({ onFinished }: Props) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const shieldScale = useRef(new Animated.Value(0.7)).current;
  const shieldOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    // Phase 1: shield fades + scales in
    Animated.parallel([
      Animated.spring(shieldScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
      Animated.timing(shieldOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      // Phase 2: text fades in
      Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start(() => {
        // Phase 3: tagline fades in
        Animated.timing(taglineOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start(() => {
          // Phase 4: heartbeat pulse (2 beats)
          const beat = Animated.sequence([
            Animated.parallel([
              Animated.timing(pulseScale, { toValue: 1.4, duration: 180, useNativeDriver: true }),
              Animated.timing(pulseOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: true }),
              Animated.timing(pulseOpacity, { toValue: 0.7, duration: 0, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(pulseScale, { toValue: 1.4, duration: 180, useNativeDriver: true }),
              Animated.timing(pulseOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: true }),
              Animated.timing(pulseOpacity, { toValue: 0.7, duration: 0, useNativeDriver: true }),
            ]),
          ]);

          beat.start(() => {
            // Phase 5: hold briefly, then fade out entire splash
            setTimeout(() => {
              Animated.timing(containerOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
                onFinished();
              });
            }, 600);
          });
        });
      });
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      {/* Subtle radial glow behind the icon */}
      <View style={styles.glowRing} />

      {/* Shield icon with heartbeat pulse ring */}
      <Animated.View style={{ transform: [{ scale: shieldScale }], opacity: shieldOpacity, alignItems: "center" }}>
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="shield-alert" size={52} color="#e8003a" />
          </View>
        </View>
      </Animated.View>

      {/* NEXORA + EmergencyAlert wordmark */}
      <Animated.View style={[styles.textBlock, { opacity: textOpacity }]}>
        <Text style={styles.nexora}>NEXORA</Text>
        <Text style={styles.appName}>EmergencyAlert</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Built for Every Second That Matters
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#06060e",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  glowRing: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(232,0,58,0.06)",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  pulseRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(232,0,58,0.25)",
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 26,
    backgroundColor: "rgba(232,0,58,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(232,0,58,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    alignItems: "center",
    marginBottom: 16,
  },
  nexora: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#e8003a",
    letterSpacing: 6,
    marginBottom: 6,
  },
  appName: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
    fontStyle: "italic",
    letterSpacing: 0.3,
  },
});
