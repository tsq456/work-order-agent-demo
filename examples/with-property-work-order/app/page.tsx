"use client";

import { ScrollingThread } from "@/components/scrolling-thread";
import { MobileChrome } from "@/components/mobile-chrome";
import { CampusWelcome } from "@/components/campus-welcome";

export default function Home() {
  return (
    <MobileChrome>
      <ScrollingThread
        components={{
          Welcome: CampusWelcome,
          ToolGroup: ({ children }) => (
            <div className="my-2 space-y-2">{children}</div>
          ),
        }}
      />
    </MobileChrome>
  );
}
