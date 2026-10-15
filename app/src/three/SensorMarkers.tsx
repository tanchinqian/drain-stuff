import { useState } from 'react';
import { Html } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import type { Sensor } from '../api/types';
import { palette } from './geometry';
import { SensorTrust, SensorValue } from '../components/SensorInfo';
export default function SensorMarkers({
  sensors,
  site = false,
}: {
  sensors: Sensor[];
  site?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const navigate = useNavigate();
  return (
    <>
      {sensors.map((sensor) => {
        const p = site ? sensor.siteLocation : sensor.location;
        const color =
          sensor.status === 'suspect'
            ? palette.heat3
            : sensor.status === 'offline'
              ? palette.ink2
              : palette.ink;
        return (
          <group key={sensor.sensorId} position={[p.x, p.y, p.z]}>
            <mesh
              userData={{ sensorId: sensor.sensorId }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(sensor.sensorId);
              }}
              onPointerOut={() => setHovered(null)}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/sensors?sensor=${encodeURIComponent(sensor.sensorId)}`);
              }}
            >
              {sensor.status === 'suspect' || sensor.status === 'offline' ? (
                <octahedronGeometry args={[0.105, 0]} />
              ) : (
                <boxGeometry args={[0.13, 0.13, 0.13]} />
              )}
              <meshBasicMaterial color={color} depthTest={false} />
            </mesh>
            {hovered === sensor.sensorId && (
              <Html center position={[0, 0.22, 0]} zIndexRange={[90, 0]}>
                <button
                  className="sensor-popup"
                  onClick={() => navigate(`/sensors?sensor=${encodeURIComponent(sensor.sensorId)}`)}
                >
                  <strong>{sensor.sensorId}</strong>
                  <span>
                    {sensor.metric}: <SensorValue sensor={sensor} />
                  </span>
                  <SensorTrust sensor={sensor} />
                  <span>{sensor.role} · Open sensor record</span>
                </button>
              </Html>
            )}
          </group>
        );
      })}
    </>
  );
}
