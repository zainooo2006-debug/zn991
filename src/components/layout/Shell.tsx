import { TopBar } from "./TopBar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";
import { AssistantFAB } from "./AssistantFAB";

const TOP_BAR_TEXT = "👑 أهلاً بكم في زين للعناية وزينة السيارات — جودة ملكية وعروض حصرية! 👑";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-bg-layer min-h-screen flex flex-col pb-16 md:pb-0 relative">
      <div className="site-decorative-layer" aria-hidden="true" />
      <TopBar text={TOP_BAR_TEXT} />
      <Header />
      <main className="flex-1 relative z-[1]">{children}</main>
      <Footer />
      <BottomNav />
      <AssistantFAB />
    </div>
  );
}
