"use client"

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

type GeoJSONGeometry =
  | { type: "Polygon";         coordinates: number[][][] }
  | { type: "MultiPolygon";    coordinates: number[][][][] }
  | { type: "LineString";      coordinates: number[][] }
  | { type: "MultiLineString"; coordinates: number[][][] };

interface GeoJSONData {
  geometries: GeoJSONGeometry[];
}

function latLngToVec3(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

/** Use the new interface here */
function buildCoastlinePoints(data: GeoJSONData, radius: number): Float32Array {
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

function CoastlineGlobe({ positions }: { positions: Float32Array | null }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = t * .15;
    groupRef.current.rotation.x = Math.sin(t * 0.055) * 0.1;
  });

  return (
    <group ref={groupRef}>
      {positions ? (
        <points>
          <bufferGeometry>
            {/** 2. Added 'args' prop to fix the TypeScript error */}
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
              count={positions.length / 3}
              itemSize={3}
              array={positions}
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
        <mesh>
          <icosahedronGeometry args={[1, 3]} />
          <meshBasicMaterial color={0x7a5828} wireframe transparent opacity={0.6} />
        </mesh>
      )}

      <mesh>
        <sphereGeometry args={[0.995, 48, 48]} />
        <meshBasicMaterial color={0x120e08} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.005, 0.001, 4, 120]} />
        <meshBasicMaterial color={0xc07840} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

function Scene() {
  const [positions, setPositions] = useState<Float32Array | null>(null);

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/@geo-maps/earth-coastlines-1m@0.6.0/map.geo.json")
      .then((res) => res.json())
      .then((data: GeoJSONData) => {
        setPositions(buildCoastlinePoints(data, 1));
      })
      .catch(console.error);
  }, []);

  return <CoastlineGlobe positions={positions} />;
}

export default function Globe() {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 3.6], fov: 36 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}