import { useEffect, useState, useRef, useCallback } from "react";
import { Canvas, extend, ReactThreeFiber, useThree } from "@react-three/fiber";
import { useAreaStore } from "@/state/areaStore";
import { Html, Sky, Environment, Line } from "@react-three/drei";
import * as THREE from "three";
import { useActionStore } from "@/state/exportStore";
import { GLTFExporter, GLTFLoader } from "three/examples/jsm/Addons.js";
import Car from "./Car";
import instanceFleet from "@/api/axios";
import { create } from "zustand";

const scale = 51000;

// Store to track which building is currently selected (only one at a time)
type SelectionStore = {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
};

const useSelectionStore = create<SelectionStore>((set) => ({
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),
}));

function Building({
  shape,
  extrudeSettings,
  tags,
  buildingId,
  onDelete,
}: {
  shape: THREE.Shape;
  extrudeSettings: any;
  tags: any;
  buildingId: number;
  onDelete?: (id: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [hoverPos, setHoverPos] = useState<THREE.Vector3 | null>(null);
  const [showTranslations, setShowTranslations] = useState(false);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  
  const selectedId = useSelectionStore((state) => state.selectedId);
  const setSelectedId = useSelectionStore((state) => state.setSelectedId);
  const uniqueId = `building-${buildingId}`;
  const isSelected = selectedId === uniqueId;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(buildingId);
      setSelectedId(null);
    }
  };

  // Keyboard delete handler
  useEffect(() => {
    if (!isSelected) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (onDelete) {
          onDelete(buildingId);
          setSelectedId(null);
        }
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelected, onDelete, buildingId, setSelectedId]);

  // Generate mesh name from tags
  const meshName = tags.name || `Building_${buildingId}`;

  return (
    <mesh
      name={meshName}
      userData={{ buildingId, tags, name: meshName }}
      onPointerOver={(e) => {
        setHovered(true);
        e.stopPropagation();
      }}
      onPointerOut={(e) => {
        setHovered(false);
        e.stopPropagation();
      }}
      onPointerMove={(e) => {
        setHoverPos(e.point.clone());
        e.stopPropagation();
      }}
      onClick={(e) => {
        // Toggle selection - if already selected, deselect; otherwise select this one
        setSelectedId(isSelected ? null : uniqueId);
        e.stopPropagation();
      }}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <extrudeGeometry args={[shape, extrudeSettings]} />
      <meshStandardMaterial color={hovered || isSelected ? "#007bff" : "#9da0a3"} />
      {(hovered || isSelected) && hoverPos && (
        <Html position={[hoverPos.x, hoverPos.y + extrudeSettings.depth + 0.5, hoverPos.z]} center>
          <div
            role="dialog"
            aria-label={tags.name || "Building Information"}
            style={{
              color: "#000000",
              backgroundColor: "#ffffff96",
              backdropFilter: "blur(8px)",
              border: "none",
              padding: "14px",
              borderRadius: "10px",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "13px",
              width: "200px",
              boxShadow: "0 2px 14px rgba(0, 0, 0, 0.16)",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <div
              style={{
                fontWeight: "600",
                fontSize: "15px",
                borderBottom: tags.name ? "1px solid rgba(0, 0, 0, 0.08)" : "none",
                paddingBottom: tags.name ? "6px" : "0",
                marginBottom: tags.name ? "8px" : "4px",
              }}
            >
              {tags.name || "Building Information"}
            </div>
            {["building", "height", "building:levels", "amenity", "denomination"].map(
              (key) =>
                tags[key] &&
                (key !== "building" || tags[key] !== "yes") && (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      margin: "4px 0",
                    }}
                  >
                    <span style={{ fontWeight: "500", color: "#5f6368" }}>
                      {key === "building"
                        ? "Type"
                        : key === "height"
                        ? "Height"
                        : key === "building:levels"
                        ? "Levels"
                        : key === "amenity"
                        ? "Facility"
                        : key === "denomination"
                        ? "Denomination"
                        : key.replace(/_/g, " ")}
                      :
                    </span>
                    <span style={{ textTransform: "capitalize" }}>
                      {key === "height" ? `${tags[key]} m` : tags[key]}
                    </span>
                  </div>
                )
            )}
            {[
              "addr:street",
              "addr:housenumber",
              "addr:district",
              "addr:city",
              "addr:postcode",
            ].some((key) => tags[key]) && (
              <div
                style={{
                  margin: "10px 0 8px",
                  borderTop: "1px solid rgba(0, 0, 0, 0.08)",
                  paddingTop: "8px",
                }}
              >
                <div style={{ fontWeight: "500", marginBottom: "4px", color: "#5f6368" }}>
                  Address
                </div>
                <div style={{ marginLeft: "4px", fontSize: "12px", color: "#5f6368" }}>
                  {[
                    [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
                    tags["addr:district"],
                    tags["addr:city"],
                    tags["addr:postcode"],
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            )}
            {Object.entries(tags).filter(
              ([key]) =>
                ![
                  "building",
                  "name",
                  "height",
                  "building:levels",
                  "source",
                  "amenity",
                  "denomination",
                ].includes(key) &&
                !key.startsWith("addr:") &&
                !key.startsWith("name:") &&
                !key.startsWith("alt_name:")
            ).length > 0 && (
              <div
                style={{
                  margin: "10px 0 4px",
                  borderTop: "1px solid rgba(0, 0, 0, 0.08)",
                  paddingTop: "8px",
                }}
              >
                <div
                  style={{
                    fontWeight: "500",
                    marginBottom: "4px",
                    color: "#5f6368",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                  onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
                >
                  Additional Information
                  <span>{showAdditionalInfo ? "▲" : "▼"}</span>
                </div>
                {showAdditionalInfo && (
                  <div>
                    {Object.entries(tags)
                      .filter(
                        ([key]) =>
                          ![
                            "building",
                            "name",
                            "height",
                            "building:levels",
                            "source",
                            "amenity",
                            "denomination",
                          ].includes(key) &&
                          !key.startsWith("addr:") &&
                          !key.startsWith("name:") &&
                          !key.startsWith("alt_name:")
                      )
                      .map(([key, value]) => {
                        if (
                          key === "description" ||
                          (typeof value === "string" && value.length > 80)
                        ) {
                          return (
                            <div key={key} style={{ margin: "8px 0" }}>
                              <div
                                style={{ fontWeight: "500", color: "#5f6368", marginBottom: "4px" }}
                              >
                                {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")}
                              </div>
                              <div
                                style={{
                                  textAlign: "left",
                                  fontSize: "12px",
                                  color: "#5f6368",
                                  fontWeight: "400",
                                  textWrap: "wrap",
                                  whiteSpace: "pre-wrap",
                                  lineHeight: "1.4",
                                  backgroundColor: "rgba(0,0,0,0.02)",
                                  padding: "6px 8px",
                                  borderRadius: "4px",
                                }}
                              >
                                {String(value)}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={key}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              margin: "4px 0",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "700",
                                color: "#5f6368",
                                textAlign: "left",
                              }}
                            >
                              {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")}:
                            </span>
                            <span
                              style={{
                                textTransform: "capitalize",
                                fontWeight: "400",
                                textAlign: "right",
                              }}
                            >
                              {String(value)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
            {Object.entries(tags).filter(([key]) => key.startsWith("name:")).length > 0 && (
              <div
                style={{
                  margin: "10px 0 4px",
                  borderTop: "1px solid rgba(0, 0, 0, 0.08)",
                  paddingTop: "8px",
                  textAlign: "right",
                }}
              >
                <div
                  style={{
                    fontWeight: "500",
                    marginBottom: "4px",
                    color: "#5f6368",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                  onClick={() => setShowTranslations(!showTranslations)}
                >
                  Name Translations
                  <span>{showTranslations ? "▲" : "▼"}</span>
                </div>
                {showTranslations && (
                  <div>
                    {Object.entries(tags)
                      .filter(([key]) => key.startsWith("name:"))
                      .map(([key, value]) => (
                        <div
                          key={key}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            margin: "4px 0",
                          }}
                        >
                          <span style={{ fontWeight: "500", color: "#5f6368" }}>
                            {key.replace("name:", "").toUpperCase()}:
                          </span>
                          <span style={{ textTransform: "capitalize" }}>{String(value)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
            {onDelete && (
              <div
                style={{
                  marginTop: "12px",
                  borderTop: "1px solid rgba(0, 0, 0, 0.08)",
                  paddingTop: "10px",
                }}
              >
                <div style={{ fontSize: "11px", color: "#5f6368", marginBottom: "8px", textAlign: "center" }}>
                  Press <kbd style={{ 
                    backgroundColor: "#e5e7eb", 
                    padding: "2px 6px", 
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    fontSize: "10px"
                  }}>Delete</kbd> or click button
                </div>
                <button
                  onClick={handleDelete}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "#ef4444",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "13px",
                    transition: "background-color 0.2s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#dc2626")}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#ef4444")}
                >
                  🗑️ Delete Building
                </button>
              </div>
            )}
          </div>
        </Html>
      )}
    </mesh>
  );
}

function Roads({ area }: { area: any }) {
  const [roads, setRoads] = useState<any[]>([]);
  if (!area || area.length < 2) return null;
  const refLat = (area[1].lat + area[0].lat) / 2;
  const refLng = (area[1].lng + area[0].lng) / 2;

  function project(lat: number, lng: number) {
    const x = (lng - refLng) * scale * Math.cos((refLat * Math.PI) / 180);
    const y = (lat - refLat) * scale;
    return new THREE.Vector2(x, y);
  }

  useEffect(() => {
    // Ensure correct order: south < north, west < east
    const lat1 = area[0].lat;
    const lat2 = area[1].lat;
    const lng1 = area[0].lng;
    const lng2 = area[1].lng;
    
    const south = Math.min(lat1, lat2);
    const north = Math.max(lat1, lat2);
    const west = Math.min(lng1, lng2);
    const east = Math.max(lng1, lng2);
    
    const query = `[out:json][timeout:25];(way["highway"](${south},${west},${north},${east}););out body geom;`;
    fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Response is not JSON");
        }
        return response.json();
      })
      .then((data) => {
        if (data && data.elements) {
          setRoads(data.elements);
        }
      })
      .catch((err) => console.error("Error fetching roads:", err));
  }, [area]);

  return (
    <>
      {roads.map((road, index) => {
        if (!road.geometry || road.geometry.length < 2) return null;

        const points = road.geometry.map((pt: any) => {
          const v = project(pt.lat, pt.lon);
          return new THREE.Vector3(v.x, 0.1, -v.y);
        });

        const lineGeometry: any = new THREE.BufferGeometry().setFromPoints(points);

        return <Line key={`road-${index}`} points={points} color="#34f516" lineWidth={1}></Line>;
      })}
    </>
  );
}

export function Export() {
  const { scene } = useThree();
  const action = useActionStore((state) => state.action);
  const fleetSpaceId = useActionStore((state) => state.fleetSpaceId);

  const exportType = useActionStore((state) => state.exportType);

  const setAction = useActionStore((state) => state.setAction);

  useEffect(() => {
    if (action === true) {
      setAction(false);
      exportGLB();
    }
  }, [action, setAction, scene]);

  const uploadFleet = async (blob) => {
    const formData = new FormData();

    formData.append("object", blob, "box3d.glb");
    formData.append("title", "New Object");
    formData.append("description", "");
    formData.append("spaceId", fleetSpaceId);

    await instanceFleet.post("space/file/mesh", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  };

  const exportGLB = () => {
    const sceneClone = scene.clone(true);
    sceneClone.traverse((child) => {
      if (child.userData && child.userData.skipExport === true) child.parent?.remove(child);
      if ((child as any).isHtml === true) child.parent?.remove(child);
    });
    const exporter = new GLTFExporter();
    // Include userData to preserve building names and metadata
    const options = { binary: true, embedImages: true, includeCustomExtensions: true };
    exporter.parse(
      sceneClone,
      (result) => {
        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: "model/gltf-binary" });

          if (exportType == "glb") {
            const link = document.createElement("a");
            link.style.display = "none";
            document.body.appendChild(link);
            link.href = URL.createObjectURL(blob);
            link.download = "scene.glb";
            link.click();
            document.body.removeChild(link);
          }

          if (exportType == "fleet") {
            uploadFleet(blob);
          }
        } else {
          console.error("GLB export failed: unexpected result", result);
        }
      },
      (error) => {
        console.error("An error occurred during export", error);
      },
      options
    );
  };
  return null;
}

// Individual mesh component for loaded GLB with click-to-delete
function GlbMesh({ 
  mesh,
  meshIndex,
  onDelete 
}: { 
  mesh: THREE.Mesh;
  meshIndex: number;
  onDelete: (mesh: THREE.Mesh) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [hoverPos, setHoverPos] = useState<THREE.Vector3 | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const selectedId = useSelectionStore((state) => state.selectedId);
  const setSelectedId = useSelectionStore((state) => state.setSelectedId);
  const uniqueId = `glb-mesh-${meshIndex}`;
  const isSelected = selectedId === uniqueId;

  // Clone the geometry and material to avoid modifying the original
  const geometry = mesh.geometry.clone();
  const originalMaterial = mesh.material as THREE.MeshStandardMaterial;
  
  // Get the mesh name from the original mesh
  const meshName = mesh.name || mesh.userData?.name || `Object ${meshIndex + 1}`;
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(mesh);
    setSelectedId(null);
  };

  // Keyboard delete handler
  useEffect(() => {
    if (!isSelected) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onDelete(mesh);
        setSelectedId(null);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelected, onDelete, mesh, setSelectedId]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={mesh.position.clone()}
      rotation={mesh.rotation.clone()}
      scale={mesh.scale.clone()}
      onPointerOver={(e) => {
        setHovered(true);
        e.stopPropagation();
      }}
      onPointerOut={(e) => {
        setHovered(false);
        e.stopPropagation();
      }}
      onPointerMove={(e) => {
        setHoverPos(e.point.clone());
        e.stopPropagation();
      }}
      onClick={(e) => {
        // Toggle selection - if already selected, deselect; otherwise select this one
        setSelectedId(isSelected ? null : uniqueId);
        e.stopPropagation();
      }}
    >
      <meshStandardMaterial 
        color={hovered || isSelected ? "#007bff" : (originalMaterial?.color || new THREE.Color("#9da0a3"))} 
      />
      {(hovered || isSelected) && hoverPos && (
        <Html position={[0, 2, 0]} center>
          <div
            style={{
              color: "#000000",
              backgroundColor: "#ffffff96",
              backdropFilter: "blur(8px)",
              border: "none",
              padding: "14px",
              borderRadius: "10px",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "13px",
              width: "200px",
              boxShadow: "0 2px 14px rgba(0, 0, 0, 0.16)",
            }}
          >
            <div style={{ fontWeight: "600", fontSize: "15px", marginBottom: "8px" }}>
              {meshName}
            </div>
            <div style={{ fontSize: "12px", color: "#5f6368", marginBottom: "10px" }}>
              Press <kbd style={{ 
                backgroundColor: "#e5e7eb", 
                padding: "2px 6px", 
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "11px"
              }}>Delete</kbd> or click button to remove.
            </div>
            <button
              onClick={handleDelete}
              style={{
                width: "100%",
                padding: "8px 12px",
                backgroundColor: "#ef4444",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "13px",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#dc2626")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#ef4444")}
            >
              🗑️ Delete Object
            </button>
          </div>
        </Html>
      )}
    </mesh>
  );
}

// Component to load and display GLB file with interactive meshes
function LoadedGlb() {
  const loadedGlb = useAreaStore((state) => state.loadedGlb);
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
  const [deletedMeshIds, setDeletedMeshIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (loadedGlb) {
      const loader = new GLTFLoader();
      loader.parse(
        loadedGlb,
        "",
        (gltf) => {
          const extractedMeshes: THREE.Mesh[] = [];
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Store world transform
              child.updateMatrixWorld(true);
              const worldPos = new THREE.Vector3();
              const worldQuat = new THREE.Quaternion();
              const worldScale = new THREE.Vector3();
              child.matrixWorld.decompose(worldPos, worldQuat, worldScale);
              
              const clonedMesh = child.clone();
              clonedMesh.position.copy(worldPos);
              clonedMesh.quaternion.copy(worldQuat);
              clonedMesh.scale.copy(worldScale);
              extractedMeshes.push(clonedMesh);
            }
          });
          setMeshes(extractedMeshes);
          setDeletedMeshIds(new Set());
        },
        (error) => {
          console.error("Error loading GLB:", error);
        }
      );
    }
  }, [loadedGlb]);

  const handleDeleteMesh = (meshToDelete: THREE.Mesh) => {
    const meshIndex = meshes.indexOf(meshToDelete);
    if (meshIndex !== -1) {
      setDeletedMeshIds((prev) => new Set([...prev, meshIndex]));
    }
  };

  if (meshes.length === 0) return null;

  return (
    <group>
      {meshes.map((mesh, index) => {
        if (deletedMeshIds.has(index)) return null;
        return (
          <GlbMesh 
            key={index} 
            mesh={mesh}
            meshIndex={index}
            onDelete={handleDeleteMesh}
          />
        );
      })}
    </group>
  );
}

export function Space() {
  const areas = useAreaStore((state) => state.areas);
  const removeArea = useAreaStore((state) => state.removeArea);
  const isGlbMode = useAreaStore((state) => state.isGlbMode);
  const [realCenter, setRealCenter] = useState<any>();
  const center = useAreaStore((state) => state.center);
  const refLat = (center[1].lat + center[0].lat) / 2;
  const refLng = (center[1].lng + center[0].lng) / 2;

  function project(lat: number, lng: number) {
    const x = (lng - refLng) * scale * Math.cos((refLat * Math.PI) / 180);
    const y = (lat - refLat) * scale;
    return new THREE.Vector2(x, y);
  }

  const handleDeleteBuilding = (id: number) => {
    removeArea(id);
  };

  const areaData = () => {
    const result: Array<{
      shape: THREE.Shape;
      extrudeSettings: any;
      tags: any;
      id: number;
    }> = [];
    areas.forEach((bld: any) => {
      if (!bld.geometry || bld.geometry.length < 3) return;
      const shapePoints = bld.geometry.map((pt: any) => project(pt.lat, pt.lng));
      if (!shapePoints[0].equals(shapePoints[shapePoints.length - 1]))
        shapePoints.push(shapePoints[0]);
      const shape = new THREE.Shape(shapePoints);
      let heightValue = parseFloat(bld.tags.height || "");
      const heightLevels = parseFloat(bld.tags["building:levels"] || "");
      if (isNaN(heightValue)) heightValue = 10;
      if (!isNaN(heightLevels)) heightValue = heightLevels * 2.2;
      const extrudeSettings = {
        steps: 1,
        depth: heightValue,
        bevelEnabled: false,
      };
      result.push({ shape, extrudeSettings, tags: bld.tags, id: bld.id });
    });
    return result;
  };

  useEffect(() => {
    setRealCenter(center);
  }, [areas]);

  const buildingsData = areaData();

  return (
    <Canvas 
      camera={{ fov: 90, near: 0.1, far: 7000 }} 
      raycaster={{ params: { Line: { threshold: 0.1 } } }}
      onPointerMissed={() => {}}
    >
      <ambientLight intensity={Math.PI / 2} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
      
      {/* Show buildings from map selection */}
      {!isGlbMode && buildingsData.map((item) => (
        <Building
          key={item.id}
          buildingId={item.id}
          shape={item.shape}
          extrudeSettings={item.extrudeSettings}
          tags={item.tags}
          onDelete={handleDeleteBuilding}
        />
      ))}

      {/* Show loaded GLB model */}
      {isGlbMode && <LoadedGlb />}

      {/* Show roads when we have map data (not in GLB mode) */}
      <Roads area={realCenter} />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
      <Car />
      <Export />
      <Sky distance={450000} sunPosition={[0, 1, 0]} inclination={0} azimuth={0.25} />
      <Environment preset="city" />
    </Canvas>
  );
}
