import React, { useEffect, useRef, useState } from 'react';
import {
  ConveyorDigitalTwinScene,
  ViewPreset,
  SceneToggles,
} from '../components/digital_twin/threeScene';
import { SensorMetadata } from '../components/digital_twin/sensorData';
import { SensorInspectorDrawer } from '../components/digital_twin/SensorInspectorDrawer';
import { DigitalTwinControls } from '../components/digital_twin/DigitalTwinControls';
import { JointDetailDrawer } from '../components/overview/JointDetailDrawer';
import { LiveDataState } from '../hooks/liveDataReducer';
import { api } from '../services/api';
import { HelpCircle, Sparkles } from 'lucide-react';

interface DigitalTwinPageProps {
  state: LiveDataState;
  onNavigateToSection?: (section: string) => void;
}

export const DigitalTwinPage: React.FC<DigitalTwinPageProps> = ({ state, onNavigateToSection }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ConveyorDigitalTwinScene | null>(null);

  const [selectedSensor, setSelectedSensor] = useState<SensorMetadata | null>(null);
  const [selectedJointCode, setSelectedJointCode] = useState<string | null>(null);
  const [hoveredObjectName, setHoveredObjectName] = useState<string | null>(null);
  const [currentPreset, setCurrentPreset] = useState<ViewPreset>('overview');

  const [toggles, setToggles] = useState<SceneToggles>({
    showSensors: true,
    showBeams: true,
    showJoints: true,
    showProducts: true,
  });

  const [showHelp, setShowHelp] = useState(false);

  // 1. Initialize 3D Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new ConveyorDigitalTwinScene({
      container: containerRef.current,
      onSelectSensor: (sensor) => {
        setSelectedJointCode(null);
        setSelectedSensor(sensor);
      },
      onSelectJoint: (code) => {
        setSelectedSensor(null);
        setSelectedJointCode(code);
      },
      onHoverObject: (name) => {
        setHoveredObjectName(name);
      },
    });

    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // 2. Synchronize Telemetry with 3D Scene
  useEffect(() => {
    if (!sceneRef.current) return;

    const targetJoint = state.joints['J02'] || state.joints['CV01_J02'];
    const timeAccel = state.simStatus?.time_acceleration ?? 600.0;
    const isPaused = state.simStatus?.paused ?? false;

    sceneRef.current.updateTelemetry({
      beltSpeedMps: 4.0,
      speedFactor: timeAccel,
      isPaused,
      targetJointCode: 'J02',
      targetJointState: targetJoint?.state ?? 'HEALTHY',
      targetJointHealth: targetJoint?.health ?? 95.0,
    });
  }, [state.simStatus, state.joints]);

  // 3. Update Layer Toggles
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setToggles(toggles);
    }
  }, [toggles]);

  // 4. Switch Camera Preset
  const handleSelectPreset = (preset: ViewPreset) => {
    setCurrentPreset(preset);
    if (sceneRef.current) {
      sceneRef.current.setViewPreset(preset);
    }
  };

  const handleToggleLayer = (layer: keyof SceneToggles) => {
    setToggles((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const handleTogglePause = async () => {
    try {
      if (state.simStatus?.paused) {
        await api.resumeSimulation();
      } else {
        await api.pauseSimulation();
      }
    } catch (err) {
      console.error('Failed to toggle pause state:', err);
    }
  };

  const handleResetSim = async () => {
    try {
      await api.resetSimulation();
      await api.resumeSimulation().catch(() => {});
    } catch (err) {
      console.error('Failed to reset sim:', err);
    }
  };

  // Selected joint data for drawer
  const selectedJoint = selectedJointCode
    ? state.joints[selectedJointCode] || state.joints[`CV01_${selectedJointCode}`]
    : null;
  const jointHistory = selectedJointCode ? state.jointHistory[selectedJointCode] || [] : [];
  const latestPass = state.latestPassEvents.length > 0 ? state.latestPassEvents[0] : null;

  return (
    <div className="relative flex-1 w-full h-[calc(100vh-8.5rem)] min-h-[580px] bg-slate-950 overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top and Bottom Floating Control Overlays */}
      <DigitalTwinControls
        currentPreset={currentPreset}
        onSelectPreset={handleSelectPreset}
        toggles={toggles}
        onToggleLayer={handleToggleLayer}
        beltSpeedMps={4.0}
        currentLap={state.simStatus?.current_lap ?? 0}
        beltPositionM={state.simStatus?.belt_position_m ?? 0}
        targetJointCode="J02"
        targetJointHealth={state.joints['J02']?.health ?? 95.0}
        targetJointState={state.joints['J02']?.state ?? 'HEALTHY'}
        isPaused={state.simStatus?.paused ?? false}
        onTogglePause={handleTogglePause}
        onResetSim={handleResetSim}
        hoveredObjectName={hoveredObjectName}
      />

      {/* Floating Help / Guide Button */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="p-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-lg cursor-pointer"
          title="Digital Twin Controls & Sensor Guide"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Navigation / Help Modal Overlay */}
      {showHelp && (
        <div className="absolute bottom-16 right-4 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg p-4 shadow-2xl z-30 text-xs text-slate-300 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Digital Twin Navigation
            </span>
            <button
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <ul className="space-y-1.5 text-[11px] font-mono">
            <li>• <strong className="text-white">Left Click + Drag:</strong> Rotate viewpoint (Orbit)</li>
            <li>• <strong className="text-white">Right Click + Drag:</strong> Pan camera laterally</li>
            <li>• <strong className="text-white">Scroll Wheel:</strong> Zoom in / out</li>
            <li>• <strong className="text-white">Click any Sensor:</strong> Open technical hardware inspector</li>
            <li>• <strong className="text-white">Click any Splice Joint:</strong> Open Joint Health card & RUL</li>
          </ul>
          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400">
            Rendered in Three.js with dynamic PBR materials, active laser profiling, and real-time odometry syncing with the FastAPI backend.
          </div>
        </div>
      )}

      {/* Sensor Inspector Slide-Over Drawer */}
      <SensorInspectorDrawer
        sensor={selectedSensor}
        onClose={() => setSelectedSensor(null)}
        onFocusView={() => {
          if (!selectedSensor) return;
          if (selectedSensor.category === 'laser' || selectedSensor.category === 'tension') {
            handleSelectPreset('lidar');
          } else if (selectedSensor.category === 'vision') {
            handleSelectPreset('camera');
          } else if (selectedSensor.category === 'proximity') {
            handleSelectPreset('rupture');
          } else {
            handleSelectPreset('overview');
          }
        }}
      />

      {/* Splice Joint Detail Slide-Over Drawer */}
      {selectedJointCode && selectedJoint && (
        <div className="absolute top-4 right-4 bottom-4 w-96 max-w-full z-30">
          <JointDetailDrawer
            jointCode={selectedJointCode}
            joint={selectedJoint}
            historyPoints={jointHistory}
            alerts={state.alerts}
            latestPass={latestPass}
            onClose={() => setSelectedJointCode(null)}
            onNavigateToSection={onNavigateToSection}
          />
        </div>
      )}
    </div>
  );
};
