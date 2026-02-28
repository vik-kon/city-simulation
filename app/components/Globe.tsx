"use client"

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Convert lat/lng (degrees) to 3D position on a sphere */
function latLngToVec3(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

/** Extract all coordinate points from a GeometryCollection */
function buildCoastlinePoints(data: any, radius: number): Float32Array {
  const points: number[] = [];

  const processRing = (ring: number[][]) => {
    for (const coord of ring) {
      const [lng, lat] = coord;
      const [x, y, z] = latLngToVec3(lat, lng, radius);
      points.push(x, y, z);
    }
  };

  for (const geometry of data.geometries) {
    const { type, coordinates } = geometry;
    if (type === "Polygon") {
      for (const ring of coordinates) processRing(ring);
    } else if (type === "MultiPolygon") {
      for (const polygon of coordinates) {
        for (const ring of polygon) processRing(ring);
      }
    } else if (type === "LineString") {
      processRing(coordinates);
    } else if (type === "MultiLineString") {
      for (const line of coordinates) processRing(line);
    }
  }

  return new Float32Array(points);
}

/** Single component — same group ref throughout, no remount stutter */
function CoastlineGlobe({ positions }: { positions: Float32Array | null }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.16;
    groupRef.current.rotation.x = Math.sin(t * 0.055) * 0.1;
  });

  return (
    <>
      <group ref={groupRef}>
        {/* Coastline dots — shown after data loads */}
        {positions ? (
          <points>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={positions}
                count={positions.length / 3}
                itemSize={3}
              />
            </bufferGeometry>
            <pointsMaterial
              color={0xc07840}
              size={0.006}
              sizeAttenuation
              transparent
              opacity={0.8}
            />
          </points>
        ) : (
          /* Wireframe fallback — same group, no rotation reset */
          <mesh>
            <icosahedronGeometry args={[1, 3]} />
            <meshBasicMaterial color={0x7a5828} wireframe transparent opacity={0.6} />
          </mesh>
        )}

        {/* Inner dark sphere */}
        <mesh>
          <sphereGeometry args={[0.995, 48, 48]} />
          <meshBasicMaterial color={0x120e08} />
        </mesh>

        {/* Equator ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.005, 0.001, 4, 120]} />
          <meshBasicMaterial color={0xc07840} transparent opacity={0.2} />
        </mesh>
      </group>

      {/* Outer ambient glow */}
      <mesh>
        <sphereGeometry args={[1.1, 32, 32]} />
        <meshBasicMaterial
          color={0x5a3010}
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
}

function Scene() {
  const [positions, setPositions] = useState<Float32Array | null>(null);

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/@geo-maps/earth-coastlines-1m@0.6.0/map.geo.json")
      .then((res) => res.json())
      .then((data) => {
        setPositions(buildCoastlinePoints(data, 1));
      })
      .catch(console.error);
  }, []);

  return <CoastlineGlobe positions={positions} />;
}

export default function Globe() {
  return (
    <Canvas
      className="!fixed inset-0 z-[1]"
      camera={{ position: [0, 0, 3.6], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Scene />
    </Canvas>
  );
}