import { useState, useEffect } from "react";
import { Step } from "react-joyride";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useTourSteps = (): Step[] => {
  return [
    {
      target: "body",
      content: "Welcome to Omanut BMS! Let's take a quick tour to help you get started with your business management system.",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-tour="sidebar"]',
      content: "This is your navigation sidebar. Use it to access different modules of your business management system.",
      placement: "right",
    },
    {
      target: '[data-tour="dashboard-home"]',
      content: "Your Dashboard shows key metrics at a glance - inventory value, revenue, alerts, and more.",
      placement: "bottom",
    },
    {
      target: '[data-tour="quick-actions"]',
      content: "Quick Actions let you jump directly to the most common tasks like recording sales or managing inventory.",
      placement: "top",
    },
    {
      target: '[data-tour="category-sales-finance"]',
      content: "Sales & Finance: Record transactions, manage receipts, track accounts, and handle your financial operations.",
      placement: "right",
    },
    {
      target: '[data-tour="category-inventory-stock"]',
      content: "Inventory & Stock: Manage your products, track stock levels, handle returns, and get low-stock alerts.",
      placement: "right",
    },
    {
      target: '[data-tour="category-team-hr"]',
      content: "Team: Manage HR, payroll with NAPSA/PAYE/NHIMA calculations, and your agent distribution network.",
      placement: "right",
    },
    {
      target: '[data-tour="admin-section"]',
      content: "Admin Settings: Configure access control, tenant settings, and manage your organization.",
      placement: "right",
    },
    {
      target: '[data-tour="modules-nav"]',
      content: "Modules & Add-ons: Explore additional features, upgrade your plan, and customize your BMS with powerful add-ons.",
      placement: "right",
    },
    {
      target: '[data-tour="header-notifications"]',
      content: "Stay updated with notifications about important events, alerts, and system updates.",
      placement: "bottom",
    },
    {
      target: "body",
      content: "You're all set! Explore the platform and reach out if you need help. Happy managing! 🎉",
      placement: "center",
    },
  ];
};

export const useOnboardingTour = () => {
  const [runTour, setRunTour] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(true); // Default to true to prevent flash
  const [isLoading, setIsLoading] = useState(true);
  const [welcomeVideoCompleted, setWelcomeVideoCompleted] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkTourStatus = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Check localStorage first for quick response
        const localKey = `tour_completed_${user.id}`;
        const localCompleted = localStorage.getItem(localKey);
        const videoKey = `welcome_video_seen_${user.id}`;
        const videoCompleted = localStorage.getItem(videoKey);
        
        setWelcomeVideoCompleted(videoCompleted === "true");
        
        if (localCompleted === "true") {
          setTourCompleted(true);
          setIsLoading(false);
          return;
        }

        // Check profile metadata (using profiles table)
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, created_at")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          // Check if this is a new user (created within last 5 minutes)
          const createdAt = new Date(profile.created_at);
          const now = new Date();
          const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
          
          // If user was created more than 5 minutes ago and no localStorage, assume they've seen it
          if (diffMinutes > 5 && !localCompleted) {
            localStorage.setItem(localKey, "true");
            setTourCompleted(true);
          } else if (localCompleted !== "true") {
            // New user - wait for video to complete before starting tour
            setTourCompleted(false);
            // Only start tour if video is already completed
            if (videoCompleted === "true") {
              setRunTour(true);
            }
          }
        }
      } catch (error) {
        console.error("Error checking tour status:", error);
        setTourCompleted(true); // Default to completed on error
      } finally {
        setIsLoading(false);
      }
    };

    checkTourStatus();
  }, [user?.id]);

  const completeTour = () => {
    if (user?.id) {
      localStorage.setItem(`tour_completed_${user.id}`, "true");
    }
    setTourCompleted(true);
    setRunTour(false);
  };

  const startTour = () => {
    setRunTour(true);
  };

  const resetTour = () => {
    if (user?.id) {
      localStorage.removeItem(`tour_completed_${user.id}`);
    }
    setTourCompleted(false);
    setRunTour(true);
  };

  const onWelcomeVideoComplete = () => {
    setWelcomeVideoCompleted(true);
    // Start tour after video completes if tour hasn't been completed
    if (!tourCompleted) {
      setRunTour(true);
    }
  };

  return {
    runTour,
    setRunTour,
    tourCompleted,
    isLoading,
    completeTour,
    startTour,
    resetTour,
    welcomeVideoCompleted,
    onWelcomeVideoComplete,
  };
};
