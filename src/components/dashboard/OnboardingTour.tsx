import Joyride, { CallBackProps, STATUS } from "react-joyride";
import { useTourSteps } from "@/hooks/useOnboardingTour";

interface OnboardingTourProps {
  run: boolean;
  onComplete: () => void;
}

export function OnboardingTour({ run, onComplete }: OnboardingTourProps) {
  const steps = useTourSteps();

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      onComplete();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      spotlightClicks
      disableOverlayClose={false}
      disableScrolling={false}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "#004B8D",
          textColor: "#003366",
          backgroundColor: "#ffffff",
          arrowColor: "#ffffff",
          overlayColor: "rgba(0, 51, 102, 0.5)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 10px 40px rgba(0, 75, 141, 0.2)",
        },
        tooltipContainer: {
          textAlign: "left" as const,
        },
        tooltipTitle: {
          fontSize: "18px",
          fontWeight: 600,
          marginBottom: "8px",
        },
        tooltipContent: {
          fontSize: "14px",
          lineHeight: "1.6",
          color: "#004B8D",
        },
        buttonNext: {
          backgroundColor: "#004B8D",
          borderRadius: "8px",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: 500,
        },
        buttonBack: {
          color: "#004B8D",
          marginRight: "10px",
          fontSize: "14px",
        },
        buttonSkip: {
          color: "#6b7280",
          fontSize: "13px",
        },
        spotlight: {
          borderRadius: "8px",
        },
        beacon: {
          display: "none",
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Get Started!",
        next: "Next",
        skip: "Skip Tour",
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
}
