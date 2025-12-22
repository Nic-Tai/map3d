import { css } from "@emotion/react";
import { Space } from "../three/Space";
import { FullscreenModal } from "../components/FullscreenModal";
import { Title } from "@/components/text/Title";
import { Description } from "@/components/text/Description";
import { Column } from "@/components/flex/Column";
import { MapComponent } from "@/components/map/SelectMap";
import { useEffect, useState } from "react";
import {
  Button,
  NextButton,
  PrevButton,
} from "@/components/button/BottomButton";
import { BuildingHeights } from "@/components/map/Processing";
import { ChevronLeft, ChevronRight, Download, Upload, Trash2 } from "lucide-react";
import { useAreaStore } from "@/state/areaStore";
import { useActionStore } from "@/state/exportStore";
import { Modal } from "@/components/modal/Modal";
import { TopNav } from "@/components/nav/TopNav";
import { getCookie } from "@/utils/cookie";
import { Row } from "@/components/flex/Row";
import instanceFleet from "@/api/axios";

const IconSize = css({
  width: "14px",
  height: "14px",
});

function App() {
  const [isNextButtonDisabled, setIsNextButtonDisabled] = useState(true);
  const [areaData, setAreaData] = useState([]);
  const [steps, setSteps] = useState(["front", "processing", "view"]);
  const [step, setStep] = useState(0);
  const [isWarnModal, setIsWarnModal] = useState(false);
  const [isExportModal, setIsExportModal] = useState(false);
  const [isFleetLogin, setIsFleetLogin] = useState(false);
  const [isFleetModal, setIsFleetModal] = useState(false);
  const [spaceList, setSpaceList] = useState([]);

  const setCenter = useAreaStore((state) => state.setCenter);
  const areas = useAreaStore((state) => state.areas);
  const setLoadedGlb = useAreaStore((state) => state.setLoadedGlb);
  const setIsGlbMode = useAreaStore((state) => state.setIsGlbMode);
  const isGlbMode = useAreaStore((state) => state.isGlbMode);
  const clearAll = useAreaStore((state) => state.clearAll);
  const setAction = useActionStore((state) => state.setAction);
  const setFleet = useActionStore((state) => state.setFleet);

  const checkIsBig = () => {
    const a = areaData[0].lat - areaData[1].lat;
    const b = areaData[0].lng - areaData[1].lng;

    console.log(a + b);

    if (a + b > 0.1) {
      return true;
    } else {
      return false;
    }
  };

  const exportFile = () => {
    setAction(true);
  };

  const exportFleet = () => {
    setAction(true);
  };

  const getFleetSpaces = async () => {
    const getSpace: any = await instanceFleet.get("space");

    setSpaceList([
      ...getSpace.data.spaces.map((item) => {
        return {
          ...item,
          key: item.id,
        };
      }),
    ]);
  };

  const putGlbOnFleetSpace = (spaceId) => {
    setFleet(spaceId, "fleet");
    setTimeout(() => {
      exportFleet();
    }, 100);
  };

  const loadFleetSpace = () => {
    getFleetSpaces();
    setIsFleetModal(true);
  };

  const checkFleetLogin = () => {
    try {
      const isCookie = getCookie("token");
      if (isCookie) {
        setIsFleetLogin(true);
      }
    } catch (error) {}
  };

  const handleDone = (data) => {
    setAreaData(data);
    setCenter(data);
    console.log(data, "AAEE");
    setIsNextButtonDisabled(false);
  };

  const handleRemove = () => {
    setAreaData([]);
    setIsNextButtonDisabled(true);
  };

  const handleClickNextStep = () => {
    if (step == 0 && checkIsBig()) {
      setIsWarnModal(true);
      return false;
    }
    setStep(step + 1);
  };

  const handleClickPrevStep = () => {
    setStep(step - 1);
  };

  const handleClickExport = () => {
    setIsExportModal(true);
  };

  const handleGlbUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        setLoadedGlb(arrayBuffer);
        setIsGlbMode(true);
        setStep(2); // Go directly to view step
        setIsNextButtonDisabled(false);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleClearAndRestart = () => {
    clearAll();
    setStep(0);
    setIsNextButtonDisabled(true);
    setAreaData([]);
  };

  useEffect(() => {
    checkFleetLogin();
  }, []);

  // Enable next button when buildings are loaded on processing step
  useEffect(() => {
    if (step === 1 && areas && areas.length > 0) {
      setIsNextButtonDisabled(false);
    }
  }, [areas, step]);

  return (
    <div css={css({ height: "100%", width: "100%" })}>
      <TopNav step={step} />

      <FullscreenModal isOpen={steps[step] == "front"}>
        <Column gap="1rem">
          <Column gap="0.5rem">
            <Title>Generate 3d map</Title>
            <Description>
              Tools to create 3D maps based on maps and export them in GLB
              format
            </Description>
          </Column>

          {/* GLB Upload Section */}
          <div
            css={css({
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              padding: "1rem",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              border: "2px dashed #cbd5e1",
              marginBottom: "0.5rem",
            })}
          >
            <div css={css({ flex: 1 })}>
              <div css={css({ fontWeight: 600, color: "#334155", marginBottom: "4px" })}>
                Load existing GLB
              </div>
              <div css={css({ fontSize: "13px", color: "#64748b" })}>
                Upload a previously exported GLB file to view it directly
              </div>
            </div>
            <label
              css={css({
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#6366f1",
                color: "#ffffff",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "14px",
                transition: "background-color 0.2s",
                ":hover": {
                  backgroundColor: "#4f46e5",
                },
              })}
            >
              <Upload css={IconSize} />
              Upload GLB
              <input
                type="file"
                accept=".glb"
                onChange={handleGlbUpload}
                css={css({ display: "none" })}
              />
            </label>
          </div>

          <div css={css({ 
            textAlign: "center", 
            color: "#94a3b8", 
            fontSize: "13px",
            fontWeight: 500,
          })}>
            — OR select area from map —
          </div>

          <MapComponent
            onRemove={handleRemove}
            onDone={handleDone}
          ></MapComponent>
        </Column>
      </FullscreenModal>

      <FullscreenModal isOpen={steps[step] == "processing"}>
        <Column gap="1rem">
          <Column gap="0.5rem">
            <Title>Processing</Title>
            <Description>
              Click the button below to get the building information.
            </Description>

            <BuildingHeights area={areaData} />
          </Column>
        </Column>
      </FullscreenModal>

      {steps[step] == "view" && (
        <div
          css={css({
            position: "fixed",
            top: "4rem",
            left: "1rem",
            zIndex: 10,
            backgroundColor: "#ffffffc9",
            backdropFilter: "blur(8px)",
            padding: "1rem",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
            maxWidth: "280px",
          })}
        >
          <Column gap="0.75rem">
            <Title>3D View</Title>
            <Description>
              {isGlbMode 
                ? "Viewing uploaded GLB file. Use mouse to orbit, scroll to zoom."
                : `Showing ${areas.length} buildings. Click a building to see info or delete it.`
              }
            </Description>
            
            <div css={css({ 
              display: "flex", 
              gap: "0.5rem",
              marginTop: "0.5rem",
            })}>
              <button
                onClick={handleClearAndRestart}
                css={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  transition: "all 0.2s",
                  ":hover": {
                    backgroundColor: "#e2e8f0",
                  },
                })}
              >
                <Trash2 css={css({ width: "14px", height: "14px" })} />
                Clear & Restart
              </button>
            </div>
          </Column>
        </div>
      )}

      <PrevButton isShow={step != 0} onClick={handleClickPrevStep}>
        <ChevronLeft css={IconSize} /> Prev Step
      </PrevButton>

      <NextButton
        isShow={step != 2}
        disabled={isNextButtonDisabled}
        onClick={handleClickNextStep}
      >
        Next Step <ChevronRight css={IconSize} />
      </NextButton>

      <NextButton isShow={step == 2} onClick={handleClickExport}>
        Export GLB <Download css={IconSize} />
      </NextButton>

      <Modal isOpen={isWarnModal} onClose={() => setIsWarnModal(false)}>
        <Column gap="0.5rem">
          <Title>The area is too big </Title>
          <Description>Do you want to proceed?</Description>
          <Button
            isShow={step != 2}
            disabled={isNextButtonDisabled}
            onClick={() => {
              setStep(step + 1);
              setIsWarnModal(false);
            }}
          >
            Next Step <ChevronRight css={IconSize} />
          </Button>
        </Column>
      </Modal>

      <Modal isOpen={isExportModal} onClose={() => setIsExportModal(false)}>
        <Column gap="0.5rem">
          <Title>Export</Title>

          <Row gap="0.5rem">
            <Button isShow={true} onClick={exportFile}>
              GLB Download <Download css={IconSize} />
            </Button>

            {isFleetLogin ? (
              <Button isShow={true} onClick={loadFleetSpace}>
                Fleet Interlock
              </Button>
            ) : (
              <Button
                isShow={true}
                onClick={() => window.open("https://fleet.im/auth")}
              >
                Fleet Login
              </Button>
            )}
          </Row>
        </Column>
      </Modal>

      <Modal isOpen={isFleetModal} onClose={() => setIsFleetModal(false)}>
        <Column gap="0.5rem">
          <Title>Select Fleet Space</Title>
          {spaceList.map((item, index) => (
            <Button isShow={true} onClick={() => putGlbOnFleetSpace(item.id)}>
              {item.title}
            </Button>
          ))}
        </Column>
      </Modal>

      <Space></Space>
    </div>
  );
}

export default App;
